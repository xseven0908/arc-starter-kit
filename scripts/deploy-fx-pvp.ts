import { ethers } from "hardhat";

async function main() {
  const AtomicFxPvP = await ethers.getContractFactory("AtomicFxPvP");
  const contract = await AtomicFxPvP.deploy();
  await contract.waitForDeployment();

  console.log("AtomicFxPvP deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
