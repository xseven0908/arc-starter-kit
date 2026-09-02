import { ethers } from "hardhat";

async function main() {
  const SavingsPool = await ethers.getContractFactory("SavingsPool");
  const contract = await SavingsPool.deploy();
  await contract.waitForDeployment();

  console.log("SavingsPool deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
