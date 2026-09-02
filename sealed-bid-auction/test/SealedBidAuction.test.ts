import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const COMMIT_WINDOW = 3600; // 1 hour
const REVEAL_WINDOW = 3600;

function commitHash(amount: bigint, salt: string, bidder: string) {
  return ethers.solidityPackedKeccak256(["uint256", "bytes32", "address"], [amount, salt, bidder]);
}

describe("SealedBidAuction", function () {
  async function deployAndCreate(depositCap = ethers.parseEther("1.0")) {
    const [seller, alice, bob] = await ethers.getSigners();
    const Auction = await ethers.getContractFactory("SealedBidAuction");
    const auction = await Auction.deploy();

    await auction.connect(seller).createAuction("vintage watch", depositCap, COMMIT_WINDOW, REVEAL_WINDOW);

    return { auction, seller, alice, bob, depositCap };
  }

  it("runs a full auction: highest revealed bid wins, seller paid, loser refunded", async function () {
    const { auction, seller, alice, bob, depositCap } = await deployAndCreate();

    const aliceAmount = ethers.parseEther("0.7");
    const aliceSalt = ethers.hexlify(ethers.randomBytes(32));
    const bobAmount = ethers.parseEther("0.4");
    const bobSalt = ethers.hexlify(ethers.randomBytes(32));

    await auction.connect(alice).commitBid(0, commitHash(aliceAmount, aliceSalt, alice.address), { value: depositCap });
    await auction.connect(bob).commitBid(0, commitHash(bobAmount, bobSalt, bob.address), { value: depositCap });

    await time.increase(COMMIT_WINDOW + 1);

    await expect(auction.connect(alice).revealBid(0, aliceAmount, aliceSalt))
      .to.emit(auction, "BidRevealed")
      .withArgs(0n, alice.address, aliceAmount);
    await auction.connect(bob).revealBid(0, bobAmount, bobSalt);

    await time.increase(REVEAL_WINDOW + 1);

    const sellerBefore = await ethers.provider.getBalance(seller.address);
    const bobBefore = await ethers.provider.getBalance(bob.address);

    const finalizeTx = await auction.connect(seller).finalizeAuction(0);
    await expect(finalizeTx).to.emit(auction, "AuctionFinalized").withArgs(0n, alice.address, aliceAmount);
    const finalizeReceipt = await finalizeTx.wait();
    const finalizeGasCost = finalizeReceipt!.gasUsed * finalizeReceipt!.gasPrice;

    const sellerAfter = await ethers.provider.getBalance(seller.address);
    const bobAfter = await ethers.provider.getBalance(bob.address);

    expect(sellerAfter - sellerBefore + finalizeGasCost).to.equal(aliceAmount);
    expect(bobAfter - bobBefore).to.equal(depositCap); // full refund, Bob lost

    const info = await auction.getAuction(0);
    expect(info.highestBidder).to.equal(alice.address);
    expect(info.highestBid).to.equal(aliceAmount);
  });

  it("refunds the winner the unused portion of their deposit", async function () {
    const { auction, alice, depositCap } = await deployAndCreate();
    const amount = ethers.parseEther("0.3");
    const salt = ethers.hexlify(ethers.randomBytes(32));

    await auction.connect(alice).commitBid(0, commitHash(amount, salt, alice.address), { value: depositCap });
    await time.increase(COMMIT_WINDOW + 1);
    await auction.connect(alice).revealBid(0, amount, salt);
    await time.increase(REVEAL_WINDOW + 1);

    const before = await ethers.provider.getBalance(alice.address);
    const tx = await auction.finalizeAuction(0);
    await tx.wait();
    const after = await ethers.provider.getBalance(alice.address);

    // Alice is both sole bidder and winner: gets back (depositCap - amount).
    expect(after - before).to.equal(depositCap - amount);
  });

  it("forfeits the deposit of a bidder who never reveals", async function () {
    const { auction, seller, alice, bob, depositCap } = await deployAndCreate();
    const amount = ethers.parseEther("0.5");
    const salt = ethers.hexlify(ethers.randomBytes(32));

    await auction.connect(alice).commitBid(0, commitHash(amount, salt, alice.address), { value: depositCap });
    await auction.connect(bob).commitBid(0, commitHash(amount, salt, bob.address), { value: depositCap }); // Bob never reveals

    await time.increase(COMMIT_WINDOW + 1);
    await auction.connect(alice).revealBid(0, amount, salt);
    await time.increase(REVEAL_WINDOW + 1);

    const sellerBefore = await ethers.provider.getBalance(seller.address);
    const finalizeTx = await auction.connect(seller).finalizeAuction(0);
    const finalizeReceipt = await finalizeTx.wait();
    const finalizeGasCost = finalizeReceipt!.gasUsed * finalizeReceipt!.gasPrice;
    const sellerAfter = await ethers.provider.getBalance(seller.address);

    // Seller gets Alice's winning bid + Bob's entire forfeited deposit.
    expect(sellerAfter - sellerBefore + finalizeGasCost).to.equal(amount + depositCap);
  });

  it("rejects a commit after the commit window closes", async function () {
    const { auction, alice, depositCap } = await deployAndCreate();
    await time.increase(COMMIT_WINDOW + 1);

    await expect(
      auction.connect(alice).commitBid(0, ethers.ZeroHash, { value: depositCap })
    ).to.be.revertedWith("commit window closed");
  });

  it("rejects a commit with the wrong deposit amount", async function () {
    const { auction, alice, depositCap } = await deployAndCreate();

    await expect(
      auction.connect(alice).commitBid(0, ethers.ZeroHash, { value: depositCap - 1n })
    ).to.be.revertedWith("deposit must equal depositCap");
  });

  it("rejects a reveal whose hash does not match the commitment", async function () {
    const { auction, alice, depositCap } = await deployAndCreate();
    const amount = ethers.parseEther("0.5");
    const salt = ethers.hexlify(ethers.randomBytes(32));

    await auction.connect(alice).commitBid(0, commitHash(amount, salt, alice.address), { value: depositCap });
    await time.increase(COMMIT_WINDOW + 1);

    await expect(
      auction.connect(alice).revealBid(0, amount + 1n, salt)
    ).to.be.revertedWith("reveal does not match commitment");
  });

  it("rejects finalizing before the reveal window closes", async function () {
    const { auction } = await deployAndCreate();
    await time.increase(COMMIT_WINDOW + 1);

    await expect(auction.finalizeAuction(0)).to.be.revertedWith("reveal window still open");
  });

  it("rejects finalizing twice", async function () {
    const { auction } = await deployAndCreate();
    await time.increase(COMMIT_WINDOW + REVEAL_WINDOW + 2);

    await auction.finalizeAuction(0);
    await expect(auction.finalizeAuction(0)).to.be.revertedWith("already finalized");
  });
});
