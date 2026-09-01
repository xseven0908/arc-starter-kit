// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal on-chain payment ledger for demoing events on Arc Testnet.
contract PaymentLog {
    struct Payment {
        address from;
        address to;
        uint256 amount;
        string memo;
        uint256 timestamp;
    }

    event PaymentRecorded(address indexed from, address indexed to, uint256 amount, string memo);

    Payment[] public payments;

    function recordPayment(address to, uint256 amount, string calldata memo) external {
        payments.push(Payment(msg.sender, to, amount, memo, block.timestamp));
        emit PaymentRecorded(msg.sender, to, amount, memo);
    }

    function paymentsCount() external view returns (uint256) {
        return payments.length;
    }
}
