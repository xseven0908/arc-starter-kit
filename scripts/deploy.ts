import { ethers } from "hardhat";

async function main() {
  const PaymentLog = await ethers.getContractFactory("PaymentLog");
  const contract = await PaymentLog.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("PaymentLog deployed to:", address);
  console.log("Add this to your .env as CONTRACT_ADDRESS to run `npm run watch`.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
