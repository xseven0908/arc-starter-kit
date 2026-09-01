import { ethers } from "hardhat";

async function main() {
  const Invoice = await ethers.getContractFactory("Invoice");
  const contract = await Invoice.deploy();
  await contract.waitForDeployment();

  console.log("Invoice deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
