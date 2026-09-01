import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Escrow", function () {
  async function deploy() {
    const [depositor, recipient, stranger] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    return { escrow, depositor, recipient, stranger };
  }

  it("opens an escrow and releases funds to the recipient", async function () {
    const { escrow, depositor, recipient } = await deploy();
    const amount = ethers.parseEther("2.0");

    await expect(escrow.connect(depositor).open(recipient.address, { value: amount }))
      .to.emit(escrow, "EscrowOpened")
      .withArgs(0n, depositor.address, recipient.address, amount);

    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
    await expect(escrow.connect(depositor).release(0)).to.emit(escrow, "EscrowReleased").withArgs(0n);
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(amount);
  });

  it("lets the recipient voluntarily refund the depositor", async function () {
    const { escrow, depositor, recipient } = await deploy();
    const amount = ethers.parseEther("1.0");

    await escrow.connect(depositor).open(recipient.address, { value: amount });

    const depositorBalanceBefore = await ethers.provider.getBalance(depositor.address);
    const tx = await escrow.connect(recipient).refund(0);
    await expect(tx).to.emit(escrow, "EscrowRefunded").withArgs(0n);
    const depositorBalanceAfter = await ethers.provider.getBalance(depositor.address);

    expect(depositorBalanceAfter - depositorBalanceBefore).to.equal(amount);
  });

  it("rejects release from anyone but the depositor", async function () {
    const { escrow, depositor, recipient, stranger } = await deploy();
    await escrow.connect(depositor).open(recipient.address, { value: ethers.parseEther("1.0") });

    await expect(escrow.connect(stranger).release(0)).to.be.revertedWith("only depositor can release");
    await expect(escrow.connect(recipient).release(0)).to.be.revertedWith("only depositor can release");
  });

  it("rejects reclaim before the timeout", async function () {
    const { escrow, depositor, recipient } = await deploy();
    await escrow.connect(depositor).open(recipient.address, { value: ethers.parseEther("1.0") });

    await expect(escrow.connect(depositor).reclaim(0)).to.be.revertedWith("timeout not reached");
  });

  it("allows the depositor to reclaim after the timeout", async function () {
    const { escrow, depositor, recipient } = await deploy();
    const amount = ethers.parseEther("1.0");
    await escrow.connect(depositor).open(recipient.address, { value: amount });

    await time.increase(7 * 24 * 60 * 60 + 1);

    const depositorBalanceBefore = await ethers.provider.getBalance(depositor.address);
    const tx = await escrow.connect(depositor).reclaim(0);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const depositorBalanceAfter = await ethers.provider.getBalance(depositor.address);

    expect(depositorBalanceAfter - depositorBalanceBefore + gasCost).to.equal(amount);
  });

  it("prevents double-spending a released escrow", async function () {
    const { escrow, depositor, recipient } = await deploy();
    await escrow.connect(depositor).open(recipient.address, { value: ethers.parseEther("1.0") });
    await escrow.connect(depositor).release(0);

    await expect(escrow.connect(depositor).release(0)).to.be.revertedWith("escrow not open");
    await expect(escrow.connect(recipient).refund(0)).to.be.revertedWith("escrow not open");
  });
});
