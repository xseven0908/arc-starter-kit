import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const PAYMENT_LOG_ABI = [
  "function recordPayment(address to, uint256 amount, string memo) external",
  "event PaymentRecorded(address indexed from, address indexed to, uint256 amount, string memo)",
];

const RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";
const CHAIN_ID = 5042002;
const PAYMENT_LOG_ADDRESS =
  process.env.PAYMENT_LOG_ADDRESS || "0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5";
const SPEND_CAP_USDC = process.env.SPEND_CAP_USDC || "1.0";
const ALLOWLIST = (process.env.ALLOWLIST || "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);
const AGENT_MEMO_PREFIX = "[agent] ";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Set PRIVATE_KEY in agent/.env — this is the wallet the agent signs with.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: "arc-testnet" });
const wallet = new ethers.Wallet(privateKey, provider);
const paymentLog = new ethers.Contract(PAYMENT_LOG_ADDRESS, PAYMENT_LOG_ABI, wallet);

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "arc-starter-kit-agent", version: "0.1.0" });

server.registerTool(
  "get_balance",
  {
    title: "Get native USDC balance",
    description: "Reads the native USDC balance of an Arc Testnet address (defaults to the agent's own wallet).",
    inputSchema: { address: z.string().optional().describe("Address to check; defaults to the agent's wallet.") },
  },
  async ({ address }) => {
    const target = address || wallet.address;
    const balance = await provider.getBalance(target);
    return toolResult({ address: target, balanceUsdc: ethers.formatEther(balance) });
  }
);

server.registerTool(
  "send_payment",
  {
    title: "Send a guarded USDC payment",
    description:
      `Sends native USDC to a recipient and logs it on PaymentLog with a "${AGENT_MEMO_PREFIX}" memo prefix. ` +
      `Rejected if the amount exceeds the ${SPEND_CAP_USDC} USDC per-call cap, or if the recipient is not on the allowlist.`,
    inputSchema: {
      to: z.string().describe("Recipient address (0x...)."),
      amount: z.string().describe("Amount in USDC, e.g. \"0.5\"."),
      memo: z.string().describe("Human-readable reason for the payment."),
    },
  },
  async ({ to, amount, memo }) => {
    if (!ethers.isAddress(to)) {
      return toolError(`"${to}" is not a valid address.`);
    }
    if (!ALLOWLIST.includes(to.toLowerCase())) {
      return toolError(
        `Recipient ${to} is not on the allowlist. Configure ALLOWLIST in agent/.env to permit it.`
      );
    }

    let amountWei: bigint;
    try {
      amountWei = ethers.parseEther(amount);
    } catch {
      return toolError(`"${amount}" is not a valid USDC amount.`);
    }
    const capWei = ethers.parseEther(SPEND_CAP_USDC);
    if (amountWei > capWei) {
      return toolError(`Amount ${amount} USDC exceeds the per-call spending cap of ${SPEND_CAP_USDC} USDC.`);
    }
    if (amountWei <= 0n) {
      return toolError("Amount must be greater than 0.");
    }

    const transferTx = await wallet.sendTransaction({ to, value: amountWei });
    await transferTx.wait();

    const recordTx = await paymentLog.recordPayment(to, amountWei, AGENT_MEMO_PREFIX + memo);
    await recordTx.wait();

    return toolResult({
      to,
      amountUsdc: amount,
      memo: AGENT_MEMO_PREFIX + memo,
      transferTxHash: transferTx.hash,
      recordTxHash: recordTx.hash,
    });
  }
);

// Arc Testnet's public RPC prunes eth_getLogs history; querying from block 0 fails with
// "pruned history unavailable" and even a few hundred blocks back is inconsistent
// (likely a load-balanced pool of nodes with different retention). Keep the window
// small and degrade gracefully instead of failing the whole tool call.
const LOG_LOOKBACK_BLOCKS = 200;

server.registerTool(
  "list_recent_payments",
  {
    title: "List recent PaymentLog payments",
    description:
      "Reads recent PaymentRecorded events from PaymentLog (last ~200 blocks only, due to RPC log-pruning), flagging which ones the agent made.",
    inputSchema: { limit: z.number().int().positive().max(50).optional().describe("Max results, default 10.") },
  },
  async ({ limit }) => {
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - LOG_LOOKBACK_BLOCKS);

    let events: (ethers.EventLog | ethers.Log)[];
    try {
      events = await paymentLog.queryFilter(paymentLog.filters.PaymentRecorded(), fromBlock, latestBlock);
    } catch (error) {
      return toolResult({
        payments: [],
        warning: `Could not query PaymentRecorded logs (RPC log-pruning): ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    const recent = events.slice(-(limit ?? 10)).reverse();

    const payments = recent.map((event) => {
      const log = event as ethers.EventLog;
      return {
        from: log.args.from,
        to: log.args.to,
        amountUsdc: ethers.formatEther(log.args.amount),
        memo: log.args.memo,
        isAgentPayment: typeof log.args.memo === "string" && log.args.memo.startsWith(AGENT_MEMO_PREFIX),
        txHash: log.transactionHash,
      };
    });

    return toolResult({ payments, scannedFromBlock: fromBlock, scannedToBlock: latestBlock });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
