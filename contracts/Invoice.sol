// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Invoice
/// @notice Invoices payable in native USDC (Arc's gas token). Models e-commerce settlement:
/// a seller issues an invoice, a buyer pays it in one transaction, and funds are forwarded to
/// the seller (or queued in pendingWithdrawals if the seller is a contract that rejects push
/// transfers, preventing DoS).
/// @dev DISCLAIMER / 免责声明: For personal testing, education, and Arc Testnet experimentation
/// only. Unaudited, provided "as is" without warranties of any kind. Do not use with real
/// mainnet assets. 仅供个人测试、教育与 Arc Testnet 实验使用，未经审计，不提供任何形式的保证。
contract Invoice {
    enum Status {
        Open,
        Paid,
        Cancelled
    }

    struct InvoiceData {
        address payable seller;
        address payer;
        uint256 amount;
        string memo;
        Status status;
    }

    InvoiceData[] public invoices;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 private locked = 1;

    modifier nonReentrant() {
        require(locked == 1, "reentrancy locked");
        locked = 2;
        _;
        locked = 1;
    }

    event InvoiceCreated(
        uint256 indexed id,
        address indexed seller,
        address indexed payer,
        uint256 amount,
        string memo
    );
    event InvoicePaid(uint256 indexed id, address indexed payer, uint256 amount);
    event InvoiceCancelled(uint256 indexed id);
    event PayoutQueued(uint256 indexed id, address indexed seller, uint256 amount);
    event ProceedsWithdrawn(address indexed seller, uint256 amount);

    /// @param payer Address allowed to pay this invoice, or address(0) to allow anyone.
    function createInvoice(
        address payer,
        uint256 amount,
        string calldata memo
    ) external returns (uint256 id) {
        require(amount > 0, "amount must be > 0");

        id = invoices.length;
        invoices.push(
            InvoiceData({
                seller: payable(msg.sender),
                payer: payer,
                amount: amount,
                memo: memo,
                status: Status.Open
            })
        );

        emit InvoiceCreated(id, msg.sender, payer, amount, memo);
    }

    function payInvoice(uint256 id) external payable nonReentrant {
        require(id < invoices.length, "invalid invoice id");
        InvoiceData storage inv = invoices[id];

        require(inv.status == Status.Open, "invoice not open");
        require(
            inv.payer == address(0) || inv.payer == msg.sender,
            "not the designated payer"
        );
        require(msg.value == inv.amount, "incorrect payment amount");

        inv.status = Status.Paid;
        emit InvoicePaid(id, msg.sender, msg.value);

        (bool ok, ) = inv.seller.call{value: msg.value}("");
        if (!ok) {
            pendingWithdrawals[inv.seller] += msg.value;
            emit PayoutQueued(id, inv.seller, msg.value);
        }
    }

    function cancelInvoice(uint256 id) external {
        require(id < invoices.length, "invalid invoice id");
        InvoiceData storage inv = invoices[id];

        require(msg.sender == inv.seller, "only seller can cancel");
        require(inv.status == Status.Open, "invoice not open");

        inv.status = Status.Cancelled;
        emit InvoiceCancelled(id);
    }

    /// @notice Pull-payment fallback if direct push to seller failed during payInvoice.
    function withdrawProceeds() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "no pending proceeds");

        pendingWithdrawals[msg.sender] = 0;
        emit ProceedsWithdrawn(msg.sender, amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "withdrawal transfer failed");
    }

    function invoicesCount() external view returns (uint256) {
        return invoices.length;
    }
}
