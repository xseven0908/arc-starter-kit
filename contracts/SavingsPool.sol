// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Single-asset native USDC savings pool using share accounting (ERC-4626 style
/// math, without the token wrapper). Depositors mint shares proportional to the pool's
/// value at deposit time; anyone can top up the pool via fundRewards() without minting
/// shares, which raises the redemption value of every existing share. Withdrawing burns
/// shares for a proportional slice of the pool, principal plus any accrued rewards.
///
/// This is intentionally not a collateralized lending market: Arc's native asset is USDC
/// itself, so there is no second asset to borrow against without introducing a separate
/// token. This contract only models the deposit/yield side of that use case.
contract SavingsPool {
    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    event Deposited(address indexed account, uint256 amount, uint256 shares);
    event Withdrawn(address indexed account, uint256 shares, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount);

    function deposit() external payable returns (uint256 shares) {
        require(msg.value > 0, "amount must be > 0");

        uint256 balanceBefore = address(this).balance - msg.value;
        shares = totalShares == 0 ? msg.value : (msg.value * totalShares) / balanceBefore;
        require(shares > 0, "deposit too small for current share price");

        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposited(msg.sender, msg.value, shares);
    }

    function withdraw(uint256 shares) external returns (uint256 amount) {
        require(shares > 0, "shares must be > 0");
        require(sharesOf[msg.sender] >= shares, "insufficient shares");

        amount = (shares * address(this).balance) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;

        emit Withdrawn(msg.sender, shares, amount);

        payable(msg.sender).transfer(amount);
    }

    /// @notice Add USDC to the pool without minting shares, raising the value of every
    /// existing share. Open to anyone (e.g. a protocol treasury topping up yield).
    function fundRewards() external payable {
        require(msg.value > 0, "amount must be > 0");
        require(totalShares > 0, "no depositors to reward");

        emit RewardsFunded(msg.sender, msg.value);
    }

    /// @notice Current redeemable value of an account's shares.
    function balanceOf(address account) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (sharesOf[account] * address(this).balance) / totalShares;
    }
}
