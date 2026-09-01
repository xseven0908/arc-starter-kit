import { privateKeyToAccount } from "viem/accounts";
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2/next";
import type { BridgeChain } from "@circle-fin/bridge-kit/chains";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Set PRIVATE_KEY in .env");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const sourceChain = (process.env.BRIDGE_SOURCE_CHAIN || "Base_Sepolia") as BridgeChain;
  const amount = process.env.BRIDGE_AMOUNT || "1.00";

  const adapter = createViemAdapterFromPrivateKey({ privateKey });
  const kit = new AppKit();

  console.log(
    `Bridging ${amount} USDC: ${sourceChain} -> Arc_Testnet (${account.address})`
  );

  const result = await kit.bridge({
    from: { adapter, chain: sourceChain },
    to: { adapter, chain: "Arc_Testnet" },
    amount,
  });

  console.log(`Bridge ${result.state} (${result.amount} ${result.token} via ${result.provider})`);
  for (const step of result.steps) {
    console.log(` - [${step.state}] ${step.name}${step.txHash ? `: ${step.txHash}` : ""}`);
    if (step.explorerUrl) console.log(`   ${step.explorerUrl}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
