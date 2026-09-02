import { ethers } from "hardhat";

async function main() {
  const Auction = await ethers.getContractFactory("SealedBidAuction");
  const auction = await Auction.deploy();
  await auction.waitForDeployment();

  console.log("SealedBidAuction deployed to:", await auction.getAddress());
  console.log("Add this to .env as AUCTION_ADDRESS to run `npm run demo`.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
