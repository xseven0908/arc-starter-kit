import { privateKeyToAccount } from "viem/accounts";
import { AppKit } from "@circle-fin/app-kit";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Set PRIVATE_KEY in .env");
  }

  const address = privateKeyToAccount(privateKey as `0x${string}`).address;
  const kit = new AppKit();

  const balances = await kit.unifiedBalance.getBalances({
    token: "USDC",
    sources: { address },
  });

  console.log(`Unified USDC balance for ${address}`);
  console.log(`Total confirmed: ${balances.totalConfirmedBalance}`);
  for (const entry of balances.breakdown) {
    console.log(" -", JSON.stringify(entry));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
