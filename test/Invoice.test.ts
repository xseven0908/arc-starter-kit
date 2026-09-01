import { expect } from "chai";
import { ethers } from "hardhat";

describe("Invoice", function () {
  async function deploy() {
    const [seller, payer, stranger] = await ethers.getSigners();
    const Invoice = await ethers.getContractFactory("Invoice");
    const invoice = await Invoice.deploy();
    return { invoice, seller, payer, stranger };
  }

  it("creates, pays, and forwards funds to the seller", async function () {
    const { invoice, seller, payer } = await deploy();
    const amount = ethers.parseEther("1.5");

    await expect(invoice.connect(seller).createInvoice(payer.address, amount, "order #1"))
      .to.emit(invoice, "InvoiceCreated")
      .withArgs(0n, seller.address, payer.address, amount, "order #1");

    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

    await expect(invoice.connect(payer).payInvoice(0, { value: amount }))
      .to.emit(invoice, "InvoicePaid")
      .withArgs(0n, payer.address, amount);

    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(amount);

    const stored = await invoice.invoices(0);
    expect(stored.status).to.equal(1n); // Paid
  });

  it("rejects payment from someone other than the designated payer", async function () {
    const { invoice, seller, payer, stranger } = await deploy();
    const amount = ethers.parseEther("1.0");

    await invoice.connect(seller).createInvoice(payer.address, amount, "order #2");

    await expect(
      invoice.connect(stranger).payInvoice(0, { value: amount })
    ).to.be.revertedWith("not the designated payer");
  });

  it("rejects incorrect payment amounts", async function () {
    const { invoice, seller, payer } = await deploy();
    const amount = ethers.parseEther("1.0");

    await invoice.connect(seller).createInvoice(payer.address, amount, "order #3");

    await expect(
      invoice.connect(payer).payInvoice(0, { value: ethers.parseEther("0.5") })
    ).to.be.revertedWith("incorrect payment amount");
  });

  it("allows the seller to cancel an open invoice", async function () {
    const { invoice, seller, payer } = await deploy();
    const amount = ethers.parseEther("1.0");

    await invoice.connect(seller).createInvoice(payer.address, amount, "order #4");
    await expect(invoice.connect(seller).cancelInvoice(0)).to.emit(invoice, "InvoiceCancelled").withArgs(0n);

    await expect(
      invoice.connect(payer).payInvoice(0, { value: amount })
    ).to.be.revertedWith("invoice not open");
  });

  it("allows anyone to pay when payer is address(0)", async function () {
    const { invoice, seller, stranger } = await deploy();
    const amount = ethers.parseEther("0.25");

    await invoice.connect(seller).createInvoice(ethers.ZeroAddress, amount, "open invoice");
    await expect(invoice.connect(stranger).payInvoice(0, { value: amount })).to.emit(invoice, "InvoicePaid");
  });
});
