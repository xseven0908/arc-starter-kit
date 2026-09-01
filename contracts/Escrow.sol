// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Simple escrow for native USDC. A depositor locks funds for a recipient; the
/// depositor can release them on confirmation, the recipient can voluntarily refund them,
/// and the depositor can reclaim unreleased funds after a timeout. Models "pay on
/// confirmation" p2p payment flows.
contract Escrow {
    uint256 public constant RECLAIM_TIMEOUT = 7 days;

    enum Status {
        Open,
        Released,
        Refunded
    }

    struct Deal {
        address depositor;
        address payable recipient;
        uint256 amount;
        uint256 createdAt;
        Status status;
    }

    Deal[] public deals;

    event EscrowOpened(uint256 indexed id, address indexed depositor, address indexed recipient, uint256 amount);
    event EscrowReleased(uint256 indexed id);
    event EscrowRefunded(uint256 indexed id);

    function open(address recipient) external payable returns (uint256 id) {
        require(msg.value > 0, "amount must be > 0");
        require(recipient != address(0), "recipient required");

        id = deals.length;
        deals.push(Deal({
            depositor: msg.sender,
            recipient: payable(recipient),
            amount: msg.value,
            createdAt: block.timestamp,
            status: Status.Open
        }));

        emit EscrowOpened(id, msg.sender, recipient, msg.value);
    }

    /// @notice Depositor confirms the deal and releases funds to the recipient.
    function release(uint256 id) external {
        Deal storage deal = deals[id];

        require(deal.status == Status.Open, "escrow not open");
        require(msg.sender == deal.depositor, "only depositor can release");

        deal.status = Status.Released;
        emit EscrowReleased(id);

        deal.recipient.transfer(deal.amount);
    }

    /// @notice Recipient voluntarily refunds the depositor (e.g. order cancelled).
    function refund(uint256 id) external {
        Deal storage deal = deals[id];

        require(deal.status == Status.Open, "escrow not open");
        require(msg.sender == deal.recipient, "only recipient can refund");

        deal.status = Status.Refunded;
        emit EscrowRefunded(id);

        payable(deal.depositor).transfer(deal.amount);
    }

    /// @notice Depositor reclaims funds if the recipient never acts within the timeout.
    function reclaim(uint256 id) external {
        Deal storage deal = deals[id];

        require(deal.status == Status.Open, "escrow not open");
        require(msg.sender == deal.depositor, "only depositor can reclaim");
        require(block.timestamp >= deal.createdAt + RECLAIM_TIMEOUT, "timeout not reached");

        deal.status = Status.Refunded;
        emit EscrowRefunded(id);

        payable(deal.depositor).transfer(deal.amount);
    }

    function dealsCount() external view returns (uint256) {
        return deals.length;
    }
}
