// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SavingsPool
/// @notice Single-asset native USDC savings pool using share accounting (ERC-4626 style
/// math, without the ERC-20 token wrapper). Depositors mint shares proportional to the pool's
/// tracked assets at deposit time; anyone can top up the pool via fundRewards() without minting
/// shares, which raises the redemption value of every existing share. Withdrawing burns
/// shares for a proportional slice of the pool, principal plus any accrued rewards.
///
/// Uses explicit internal accounting (`totalAssets`) rather than raw `address(this).balance`
/// so unsolicited selfdestruct/coinbase transfers cannot distort share minting calculations.
///
/// @dev DISCLAIMER / 免责声明: Educational and Arc Testnet demonstration only. This is NOT a
/// full ERC-4626 compliant token vault, is unaudited, and must not be used in production or
/// with real funds. 仅供个人测试、教育与 Arc Testnet 实验使用，非完整 ERC-4626 实现，未经审计，风险自负。
contract SavingsPool {
    uint256 public totalShares;
    uint256 public totalAssets;
    mapping(address => uint256) public sharesOf;

    uint256 private locked = 1;

    modifier nonReentrant() {
        require(locked == 1, "reentrancy locked");
        locked = 2;
        _;
        locked = 1;
    }

    event Deposited(address indexed account, uint256 amount, uint256 shares);
    event Withdrawn(address indexed account, uint256 shares, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount);

    function deposit() external payable nonReentrant returns (uint256 shares) {
        require(msg.value > 0, "amount must be > 0");

        uint256 assetsBefore = totalAssets;
        shares = (totalShares == 0 || assetsBefore == 0)
            ? msg.value
            : (msg.value * totalShares) / assetsBefore;
        require(shares > 0, "deposit too small for current share price");

        totalShares += shares;
        totalAssets += msg.value;
        sharesOf[msg.sender] += shares;

        emit Deposited(msg.sender, msg.value, shares);
    }

    function withdraw(
        uint256 shares
    ) external nonReentrant returns (uint256 amount) {
        require(shares > 0, "shares must be > 0");
        require(sharesOf[msg.sender] >= shares, "insufficient shares");

        amount = (shares * totalAssets) / totalShares;
        require(amount > 0, "withdrawal amount rounds to 0");

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= amount;

        emit Withdrawn(msg.sender, shares, amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
    }

    /// @notice Add USDC to the pool without minting shares, raising the value of every
    /// existing share. Open to anyone (e.g. a protocol treasury topping up yield).
    function fundRewards() external payable nonReentrant {
        require(msg.value > 0, "amount must be > 0");
        require(totalShares > 0, "no depositors to reward");

        totalAssets += msg.value;
        emit RewardsFunded(msg.sender, msg.value);
    }

    /// @notice Current redeemable value of an account's shares.
    function balanceOf(address account) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (sharesOf[account] * totalAssets) / totalShares;
    }
}
