import { createPublicClient, http, parseAbiItem } from "viem";
import * as dotenv from "dotenv";

dotenv.config();

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io"] } },
} as const;

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;

const paymentRecordedEvent = parseAbiItem(
  "event PaymentRecorded(address indexed from, address indexed to, uint256 amount, string memo)"
);

async function main() {
  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS in .env after running `npm run deploy`.");
  }

  const client = createPublicClient({ chain: arcTestnet, transport: http() });

  console.log(`Watching PaymentRecorded events on ${contractAddress} (Arc Testnet)...`);

  client.watchEvent({
    address: contractAddress,
    event: paymentRecordedEvent,
    onLogs: (logs) => {
      for (const log of logs) {
        const { from, to, amount, memo } = log.args;
        console.log(
          `[payment] ${from} -> ${to} | amount=${amount} | memo="${memo}" | tx=${log.transactionHash}`
        );
      }
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
