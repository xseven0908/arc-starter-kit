import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaymentLog", function () {
  it("records a payment and emits PaymentRecorded", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const PaymentLog = await ethers.getContractFactory("PaymentLog");
    const contract = await PaymentLog.deploy();

    await expect(contract.recordPayment(recipient.address, 1000n, "invoice #1"))
      .to.emit(contract, "PaymentRecorded")
      .withArgs(owner.address, recipient.address, 1000n, "invoice #1");

    expect(await contract.paymentsCount()).to.equal(1n);
  });
});
