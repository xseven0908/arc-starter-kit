import { expect } from "chai";
import { ethers } from "hardhat";

describe("SavingsPool", function () {
  async function deploy() {
    const [alice, bob, funder] = await ethers.getSigners();
    const SavingsPool = await ethers.getContractFactory("SavingsPool");
    const pool = await SavingsPool.deploy();
    return { pool, alice, bob, funder };
  }

  it("mints shares 1:1 for the first deposit", async function () {
    const { pool, alice } = await deploy();
    const amount = ethers.parseEther("10");

    await expect(pool.connect(alice).deposit({ value: amount }))
      .to.emit(pool, "Deposited")
      .withArgs(alice.address, amount, amount);

    expect(await pool.sharesOf(alice.address)).to.equal(amount);
    expect(await pool.balanceOf(alice.address)).to.equal(amount);
  });

  it("gives later depositors fewer shares once rewards have raised the share price", async function () {
    const { pool, alice, bob, funder } = await deploy();

    await pool.connect(alice).deposit({ value: ethers.parseEther("10") });
    await expect(pool.connect(funder).fundRewards({ value: ethers.parseEther("10") }))
      .to.emit(pool, "RewardsFunded")
      .withArgs(funder.address, ethers.parseEther("10"));

    // Pool now holds 20 for 10 shares -> share price is 2x, so Bob's 10 buys 5 shares.
    await pool.connect(bob).deposit({ value: ethers.parseEther("10") });
    expect(await pool.sharesOf(bob.address)).to.equal(ethers.parseEther("5"));
  });

  it("lets a depositor withdraw principal plus their share of rewards", async function () {
    const { pool, alice, funder } = await deploy();
    const deposit = ethers.parseEther("10");
    await pool.connect(alice).deposit({ value: deposit });
    await pool.connect(funder).fundRewards({ value: ethers.parseEther("10") });

    // Alice is the only depositor, so she's entitled to the full 20.
    const balanceBefore = await ethers.provider.getBalance(alice.address);
    const shares = await pool.sharesOf(alice.address);
    const tx = await pool.connect(alice).withdraw(shares);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(alice.address);

    expect(balanceAfter - balanceBefore + gasCost).to.equal(ethers.parseEther("20"));
    expect(await pool.totalShares()).to.equal(0n);
  });

  it("rejects withdrawing more shares than owned", async function () {
    const { pool, alice } = await deploy();
    await pool.connect(alice).deposit({ value: ethers.parseEther("1") });

    await expect(pool.connect(alice).withdraw(ethers.parseEther("2"))).to.be.revertedWith(
      "insufficient shares"
    );
  });

  it("rejects funding rewards before anyone has deposited", async function () {
    const { pool, funder } = await deploy();

    await expect(
      pool.connect(funder).fundRewards({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("no depositors to reward");
  });
});
