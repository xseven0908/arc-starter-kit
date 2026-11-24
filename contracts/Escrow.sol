// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Escrow
/// @notice Simple escrow for native USDC. A depositor locks funds for a recipient; the
/// depositor can release them on confirmation, the recipient can voluntarily refund them,
/// and the depositor can reclaim unreleased funds after a 7-day timeout. Models "pay on
/// confirmation" p2p payment flows with pull-payment fallback against malicious receivers.
/// @dev DISCLAIMER / 免责声明: For personal testing, education, and Arc Testnet experimentation
/// only. Unaudited, provided "as is" without warranties of any kind. Do not use with real
/// mainnet assets. 仅供个人测试、教育与 Arc Testnet 实验使用，未经审计，不提供任何形式的保证。
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
    mapping(address => uint256) public pendingWithdrawals;

    uint256 private locked = 1;

    modifier nonReentrant() {
        require(locked == 1, "reentrancy locked");
        locked = 2;
        _;
        locked = 1;
    }

    event EscrowOpened(
        uint256 indexed id,
        address indexed depositor,
        address indexed recipient,
        uint256 amount
    );
    event EscrowReleased(uint256 indexed id);
    event EscrowRefunded(uint256 indexed id);
    event EscrowPayoutQueued(
        uint256 indexed id,
        address indexed beneficiary,
        uint256 amount
    );
    event EscrowClaimed(address indexed beneficiary, uint256 amount);

    function open(address recipient) external payable returns (uint256 id) {
        require(msg.value > 0, "amount must be > 0");
        require(recipient != address(0), "recipient required");

        id = deals.length;
        deals.push(
            Deal({
                depositor: msg.sender,
                recipient: payable(recipient),
                amount: msg.value,
                createdAt: block.timestamp,
                status: Status.Open
            })
        );

        emit EscrowOpened(id, msg.sender, recipient, msg.value);
    }

    /// @notice Depositor confirms the deal and releases funds to the recipient.
    function release(uint256 id) external nonReentrant {
        require(id < deals.length, "invalid deal id");
        Deal storage deal = deals[id];

        require(deal.status == Status.Open, "escrow not open");
        require(msg.sender == deal.depositor, "only depositor can release");

        deal.status = Status.Released;
        emit EscrowReleased(id);

        _deliverOrQueue(id, deal.recipient, deal.amount);
    }

    /// @notice Recipient voluntarily refunds the depositor (e.g. order cancelled).
    function refund(uint256 id) external nonReentrant {
        require(id < deals.length, "invalid deal id");
        Deal storage deal = deals[id];

        require(deal.status == Status.Open, "escrow not open");
        require(msg.sender == deal.recipient, "only recipient can refund");

        deal.status = Status.Refunded;
        emit EscrowRefunded(id);

        _deliverOrQueue(id, payable(deal.depositor), deal.amount);
    }

    /// @notice Depositor reclaims funds if the recipient never acts within the timeout.
    function reclaim(uint256 id) external nonReentrant {
        require(id < deals.length, "invalid deal id");
        Deal storage deal = deals[id];

        require(deal.status == Status.Open, "escrow not open");
        require(msg.sender == deal.depositor, "only depositor can reclaim");
        require(
            block.timestamp >= deal.createdAt + RECLAIM_TIMEOUT,
            "timeout not reached"
        );

        deal.status = Status.Refunded;
        emit EscrowRefunded(id);

        _deliverOrQueue(id, payable(deal.depositor), deal.amount);
    }

    /// @notice Pull-payment claim if a direct push transfer failed (e.g., recipient contract reverted).
    function claimPending() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "no pending withdrawal");

        pendingWithdrawals[msg.sender] = 0;
        emit EscrowClaimed(msg.sender, amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "claim transfer failed");
    }

    function dealsCount() external view returns (uint256) {
        return deals.length;
    }

    function _deliverOrQueue(
        uint256 id,
        address payable beneficiary,
        uint256 amount
    ) private {
        (bool ok, ) = beneficiary.call{value: amount}("");
        if (!ok) {
            pendingWithdrawals[beneficiary] += amount;
            emit EscrowPayoutQueued(id, beneficiary, amount);
        }
    }
}
