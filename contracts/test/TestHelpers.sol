// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInvoiceLike {
    function createInvoice(
        address payer,
        uint256 amount,
        string calldata memo
    ) external returns (uint256);

    function withdrawProceeds() external;
}

interface IEscrowLike {
    function open(address recipient) external payable returns (uint256);

    function release(uint256 id) external;

    function refund(uint256 id) external;

    function claimPending() external;
}

/// @notice Test helper contract whose receive() can be toggled to revert, simulating a
/// malicious or broken smart-contract recipient that attempts to block push payments.
contract RevertingReceiver {
    bool public rejectReceive = true;

    function setRejectReceive(bool reject) external {
        rejectReceive = reject;
    }

    function createInvoiceOn(
        address invoiceContract,
        address payer,
        uint256 amount,
        string calldata memo
    ) external returns (uint256) {
        return
            IInvoiceLike(invoiceContract).createInvoice(payer, amount, memo);
    }

    function withdrawFromInvoice(address invoiceContract) external {
        IInvoiceLike(invoiceContract).withdrawProceeds();
    }

    function openEscrowOn(
        address escrowContract,
        address recipient
    ) external payable returns (uint256) {
        return
            IEscrowLike(escrowContract).open{value: msg.value}(recipient);
    }

    function refundEscrowOn(address escrowContract, uint256 id) external {
        IEscrowLike(escrowContract).refund(id);
    }

    function claimFromEscrow(address escrowContract) external {
        IEscrowLike(escrowContract).claimPending();
    }

    receive() external payable {
        require(!rejectReceive, "receiver rejected native transfer");
    }
}

/// @notice Minimal 6-decimal mock ERC-20 token (modeling EURC in local Hardhat tests).
contract MockEURC {
    string public constant name = "Mock Euro Coin";
    string public constant symbol = "EURC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        require(balanceOf[from] >= amount, "insufficient balance");
        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
