import { privateKeyToAccount } from "viem/accounts";
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2/next";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Set PRIVATE_KEY in .env");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const recipient = process.env.RECIPIENT_ADDRESS;
  const amount = process.env.SEND_AMOUNT || "0.10";

  if (!recipient) {
    throw new Error("Set RECIPIENT_ADDRESS in .env (the wallet that should receive USDC)");
  }

  const adapter = createViemAdapterFromPrivateKey({ privateKey });
  const kit = new AppKit();

  console.log(`Sending ${amount} USDC on Arc Testnet: ${account.address} -> ${recipient}`);

  const result = await kit.send({
    from: { adapter, chain: "Arc_Testnet" },
    to: recipient,
    amount,
    token: "USDC",
  });

  console.log(`Send ${result.state}:`, result.txHash);
  if (result.explorerUrl) {
    console.log("Explorer:", result.explorerUrl);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
