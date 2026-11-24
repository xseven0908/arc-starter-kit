// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

/// @title AtomicFxPvP
/// @notice Atomic Payment-versus-Payment (PvP) RFQ settlement between Arc native USDC (18 decimals)
/// and an ERC-20 stablecoin such as EURC (6 decimals, 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a on
/// Arc Testnet).
///
/// Models the 24/7 FX settlement & RFQ market structure discussed in the Arc "Trading & DeFi" club:
/// - A Maker locks native USDC in a quote specifying the desired ERC-20 token, required token amount,
///   optional designated Taker (or address(0) for public RFQ), and expiry timestamp.
/// - A Taker fills the quote before expiry: the contract atomically pulls the ERC-20 token from Taker
///   directly to Maker and releases the locked native USDC to Taker in a single transaction.
/// - If neither leg succeeds, the entire transaction reverts — eliminating settlement/Herstatt risk.
/// - Maker can cancel an open quote anytime (or reclaim after expiry) to recover locked native USDC.
///
/// @dev DISCLAIMER / 免责声明: For personal testing, education, and Arc Testnet experimentation
/// only. Unaudited, provided "as is" without warranties of any kind. Do not use with real
/// mainnet assets. 仅供个人测试、教育与 Arc Testnet 实验使用，未经审计，不提供任何形式的保证。
contract AtomicFxPvP {
    enum Status {
        Open,
        Filled,
        Cancelled
    }

    struct Quote {
        address payable maker;
        address taker;
        address buyToken;
        uint256 sellUsdcAmount;
        uint256 buyTokenAmount;
        uint256 expiry;
        Status status;
    }

    Quote[] public quotes;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 private locked = 1;

    modifier nonReentrant() {
        require(locked == 1, "reentrancy locked");
        locked = 2;
        _;
        locked = 1;
    }

    event QuoteCreated(
        uint256 indexed id,
        address indexed maker,
        address indexed taker,
        address buyToken,
        uint256 sellUsdcAmount,
        uint256 buyTokenAmount,
        uint256 expiry
    );
    event QuoteFilled(
        uint256 indexed id,
        address indexed maker,
        address indexed taker,
        uint256 sellUsdcAmount,
        uint256 buyTokenAmount
    );
    event QuoteCancelled(uint256 indexed id);
    event UsdcPayoutQueued(
        uint256 indexed id,
        address indexed beneficiary,
        uint256 amount
    );
    event UsdcClaimed(address indexed beneficiary, uint256 amount);

    /// @notice Maker locks native USDC (`msg.value`) and specifies the ERC-20 leg (e.g. EURC) required.
    function createQuote(
        address taker,
        address buyToken,
        uint256 buyTokenAmount,
        uint256 expiry
    ) external payable returns (uint256 id) {
        require(msg.value > 0, "USDC amount must be > 0");
        require(buyToken != address(0), "buyToken required");
        require(buyTokenAmount > 0, "buyTokenAmount must be > 0");
        require(expiry > block.timestamp, "expiry must be in the future");

        id = quotes.length;
        quotes.push(
            Quote({
                maker: payable(msg.sender),
                taker: taker,
                buyToken: buyToken,
                sellUsdcAmount: msg.value,
                buyTokenAmount: buyTokenAmount,
                expiry: expiry,
                status: Status.Open
            })
        );

        emit QuoteCreated(
            id,
            msg.sender,
            taker,
            buyToken,
            msg.value,
            buyTokenAmount,
            expiry
        );
    }

    /// @notice Taker settles the ERC-20 leg (having approved this contract) and atomically receives the Maker's native USDC.
    function fillQuote(uint256 id) external nonReentrant {
        require(id < quotes.length, "invalid quote id");
        Quote storage q = quotes[id];

        require(q.status == Status.Open, "quote not open");
        require(block.timestamp <= q.expiry, "quote expired");
        require(
            q.taker == address(0) || q.taker == msg.sender,
            "not designated taker"
        );

        q.status = Status.Filled;
        emit QuoteFilled(
            id,
            q.maker,
            msg.sender,
            q.sellUsdcAmount,
            q.buyTokenAmount
        );

        bool erc20Ok = IERC20Minimal(q.buyToken).transferFrom(
            msg.sender,
            q.maker,
            q.buyTokenAmount
        );
        require(erc20Ok, "buyToken transferFrom failed");

        _deliverOrQueue(id, payable(msg.sender), q.sellUsdcAmount);
    }

    /// @notice Maker cancels an open quote and reclaims locked native USDC.
    function cancelQuote(uint256 id) external nonReentrant {
        require(id < quotes.length, "invalid quote id");
        Quote storage q = quotes[id];

        require(q.status == Status.Open, "quote not open");
        require(msg.sender == q.maker, "only maker can cancel");

        q.status = Status.Cancelled;
        emit QuoteCancelled(id);

        _deliverOrQueue(id, q.maker, q.sellUsdcAmount);
    }

    /// @notice Pull-payment fallback if native USDC push delivery failed.
    function claimPendingUsdc() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "no pending withdrawal");

        pendingWithdrawals[msg.sender] = 0;
        emit UsdcClaimed(msg.sender, amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "claim transfer failed");
    }

    function quotesCount() external view returns (uint256) {
        return quotes.length;
    }

    function _deliverOrQueue(
        uint256 id,
        address payable beneficiary,
        uint256 amount
    ) private {
        (bool ok, ) = beneficiary.call{value: amount}("");
        if (!ok) {
            pendingWithdrawals[beneficiary] += amount;
            emit UsdcPayoutQueued(id, beneficiary, amount);
        }
    }
}
