import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("AtomicFxPvP (USDC/EURC RFQ Payment-vs-Payment)", function () {
  async function deploy() {
    const [maker, taker, stranger] = await ethers.getSigners();
    const MockEURC = await ethers.getContractFactory("MockEURC");
    const eurc = await MockEURC.deploy();

    const AtomicFxPvP = await ethers.getContractFactory("AtomicFxPvP");
    const fx = await AtomicFxPvP.deploy();

    // Mint 1,000 EURC (6 decimals) to taker
    const eurcAmount = 1_000_000_000n;
    await eurc.mint(taker.address, eurcAmount);

    return { fx, eurc, maker, taker, stranger };
  }

  it("atomically swaps Maker's native USDC (18-dec) for Taker's EURC (6-dec) in one transaction", async function () {
    const { fx, eurc, maker, taker } = await deploy();
    const sellUsdc = ethers.parseEther("108.5"); // 108.50 native USDC
    const buyEurc = 100_000_000n; // 100.00 EURC (6 decimals)
    const expiry = (await time.latest()) + 3600;

    await expect(
      fx
        .connect(maker)
        .createQuote(
          taker.address,
          await eurc.getAddress(),
          buyEurc,
          expiry,
          { value: sellUsdc },
        ),
    )
      .to.emit(fx, "QuoteCreated")
      .withArgs(
        0n,
        maker.address,
        taker.address,
        await eurc.getAddress(),
        sellUsdc,
        buyEurc,
        expiry,
      );

    await eurc.connect(taker).approve(await fx.getAddress(), buyEurc);

    const takerUsdcBefore = await ethers.provider.getBalance(taker.address);
    const tx = await fx.connect(taker).fillQuote(0);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const takerUsdcAfter = await ethers.provider.getBalance(taker.address);

    // Maker received 100 EURC; Taker received 108.5 native USDC
    expect(await eurc.balanceOf(maker.address)).to.equal(buyEurc);
    expect(takerUsdcAfter - takerUsdcBefore + gasCost).to.equal(sellUsdc);
  });

  it("supports open RFQ quotes where any Taker can fill (taker == address(0))", async function () {
    const { fx, eurc, maker, taker } = await deploy();
    const sellUsdc = ethers.parseEther("54.0");
    const buyEurc = 50_000_000n;
    const expiry = (await time.latest()) + 1800;

    await fx
      .connect(maker)
      .createQuote(
        ethers.ZeroAddress,
        await eurc.getAddress(),
        buyEurc,
        expiry,
        { value: sellUsdc },
      );

    await eurc.connect(taker).approve(await fx.getAddress(), buyEurc);
    await expect(fx.connect(taker).fillQuote(0))
      .to.emit(fx, "QuoteFilled")
      .withArgs(0n, maker.address, taker.address, sellUsdc, buyEurc);
  });

  it("rejects fill from unauthorized taker or after quote expiry", async function () {
    const { fx, eurc, maker, taker, stranger } = await deploy();
    const sellUsdc = ethers.parseEther("10.0");
    const buyEurc = 9_200_000n;
    const expiry = (await time.latest()) + 60;

    await fx
      .connect(maker)
      .createQuote(
        taker.address,
        await eurc.getAddress(),
        buyEurc,
        expiry,
        { value: sellUsdc },
      );

    await expect(fx.connect(stranger).fillQuote(0)).to.be.revertedWith(
      "not designated taker",
    );

    await time.increase(61);
    await expect(fx.connect(taker).fillQuote(0)).to.be.revertedWith(
      "quote expired",
    );
  });

  it("reverts atomically if Taker has not approved EURC (zero Herstatt risk)", async function () {
    const { fx, eurc, maker, taker } = await deploy();
    const sellUsdc = ethers.parseEther("10.0");
    const buyEurc = 9_200_000n;
    const expiry = (await time.latest()) + 300;

    await fx
      .connect(maker)
      .createQuote(
        taker.address,
        await eurc.getAddress(),
        buyEurc,
        expiry,
        { value: sellUsdc },
      );

    // No eurc.approve() called -> must revert without releasing Maker's USDC
    await expect(fx.connect(taker).fillQuote(0)).to.be.revertedWith(
      "insufficient allowance",
    );
    expect(await ethers.provider.getBalance(await fx.getAddress())).to.equal(
      sellUsdc,
    );
  });

  it("allows Maker to cancel an open quote and reclaim native USDC", async function () {
    const { fx, eurc, maker, taker, stranger } = await deploy();
    const sellUsdc = ethers.parseEther("25.0");
    const buyEurc = 23_000_000n;
    const expiry = (await time.latest()) + 600;

    await fx
      .connect(maker)
      .createQuote(
        taker.address,
        await eurc.getAddress(),
        buyEurc,
        expiry,
        { value: sellUsdc },
      );

    await expect(fx.connect(stranger).cancelQuote(0)).to.be.revertedWith(
      "only maker can cancel",
    );

    const makerBefore = await ethers.provider.getBalance(maker.address);
    const tx = await fx.connect(maker).cancelQuote(0);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const makerAfter = await ethers.provider.getBalance(maker.address);

    expect(makerAfter - makerBefore + gasCost).to.equal(sellUsdc);
    await expect(fx.connect(taker).fillQuote(0)).to.be.revertedWith(
      "quote not open",
    );
  });
});
