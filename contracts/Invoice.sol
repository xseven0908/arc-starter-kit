// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Invoices payable in native USDC (Arc's gas token). Models e-commerce settlement:
/// a seller issues an invoice, a buyer pays it in one transaction, funds land with the seller
/// immediately since USDC transfers on Arc need no ERC-20 approval step.
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

    event InvoiceCreated(uint256 indexed id, address indexed seller, address indexed payer, uint256 amount, string memo);
    event InvoicePaid(uint256 indexed id, address indexed payer, uint256 amount);
    event InvoiceCancelled(uint256 indexed id);

    /// @param payer Address allowed to pay this invoice, or address(0) to allow anyone.
    function createInvoice(address payer, uint256 amount, string calldata memo) external returns (uint256 id) {
        require(amount > 0, "amount must be > 0");

        id = invoices.length;
        invoices.push(InvoiceData({
            seller: payable(msg.sender),
            payer: payer,
            amount: amount,
            memo: memo,
            status: Status.Open
        }));

        emit InvoiceCreated(id, msg.sender, payer, amount, memo);
    }

    function payInvoice(uint256 id) external payable {
        InvoiceData storage inv = invoices[id];

        require(inv.status == Status.Open, "invoice not open");
        require(inv.payer == address(0) || inv.payer == msg.sender, "not the designated payer");
        require(msg.value == inv.amount, "incorrect payment amount");

        inv.status = Status.Paid;
        emit InvoicePaid(id, msg.sender, msg.value);

        inv.seller.transfer(msg.value);
    }

    function cancelInvoice(uint256 id) external {
        InvoiceData storage inv = invoices[id];

        require(msg.sender == inv.seller, "only seller can cancel");
        require(inv.status == Status.Open, "invoice not open");

        inv.status = Status.Cancelled;
        emit InvoiceCancelled(id);
    }

    function invoicesCount() external view returns (uint256) {
        return invoices.length;
    }
}
