// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Commit-reveal sealed-bid auction settled in native USDC.
///
/// Arc's confidential execution layer (APS) is not yet available ("Privacy features are on
/// the roadmap and not yet available on Arc" — docs.arc.io/arc/concepts/opt-in-privacy), so
/// bids can't be hidden by the chain itself. This gets the same practical result — nobody
/// can see what anyone bid until reveal — with plain commit-reveal: bidders lock a hash of
/// their bid during the commit window, then disclose the real amount during the reveal
/// window. A fixed deposit cap (the same for every bidder) stops observers from inferring a
/// bid's size from the value locked at commit time, which a naive "deposit = your bid"
/// design would leak.
contract SealedBidAuction {
    enum Phase {
        Commit,
        Reveal,
        Finalized
    }

    struct AuctionData {
        address seller;
        string item;
        uint256 depositCap;
        uint256 commitDeadline;
        uint256 revealDeadline;
        bool finalized;
        address highestBidder;
        uint256 highestBid;
        address[] bidders;
    }

    mapping(uint256 => AuctionData) private auctions;
    mapping(uint256 => mapping(address => bytes32)) public commitments;
    mapping(uint256 => mapping(address => bool)) public revealed;
    uint256 public auctionCount;

    event AuctionCreated(
        uint256 indexed id, address indexed seller, string item, uint256 depositCap, uint256 commitDeadline, uint256 revealDeadline
    );
    event BidCommitted(uint256 indexed id, address indexed bidder);
    event BidRevealed(uint256 indexed id, address indexed bidder, uint256 amount);
    event AuctionFinalized(uint256 indexed id, address indexed winner, uint256 winningBid);

    function createAuction(string calldata item, uint256 depositCap, uint256 commitWindow, uint256 revealWindow)
        external
        returns (uint256 id)
    {
        require(depositCap > 0, "depositCap must be > 0");
        require(commitWindow > 0 && revealWindow > 0, "windows must be > 0");

        id = auctionCount++;
        AuctionData storage a = auctions[id];
        a.seller = msg.sender;
        a.item = item;
        a.depositCap = depositCap;
        a.commitDeadline = block.timestamp + commitWindow;
        a.revealDeadline = a.commitDeadline + revealWindow;

        emit AuctionCreated(id, msg.sender, item, depositCap, a.commitDeadline, a.revealDeadline);
    }

    /// @param commitHash keccak256(abi.encodePacked(amount, salt, msg.sender))
    function commitBid(uint256 id, bytes32 commitHash) external payable {
        AuctionData storage a = auctions[id];
        require(block.timestamp < a.commitDeadline, "commit window closed");
        require(msg.value == a.depositCap, "deposit must equal depositCap");
        require(commitments[id][msg.sender] == bytes32(0), "already committed");

        commitments[id][msg.sender] = commitHash;
        a.bidders.push(msg.sender);

        emit BidCommitted(id, msg.sender);
    }

    function revealBid(uint256 id, uint256 amount, bytes32 salt) external {
        AuctionData storage a = auctions[id];
        require(block.timestamp >= a.commitDeadline, "commit window still open");
        require(block.timestamp < a.revealDeadline, "reveal window closed");
        require(!revealed[id][msg.sender], "already revealed");
        require(
            commitments[id][msg.sender] == keccak256(abi.encodePacked(amount, salt, msg.sender)),
            "reveal does not match commitment"
        );
        require(amount <= a.depositCap, "revealed amount exceeds depositCap");

        revealed[id][msg.sender] = true;

        if (amount > a.highestBid) {
            a.highestBid = amount;
            a.highestBidder = msg.sender;
        }

        emit BidRevealed(id, msg.sender, amount);
    }

    /// @notice Anyone can call this after the reveal window closes. Winner pays their bid to
    /// the seller and gets the unused portion of their deposit back; other revealed bidders
    /// get their full deposit back; bidders who never revealed forfeit their deposit to the
    /// seller as a no-show penalty.
    function finalizeAuction(uint256 id) external {
        AuctionData storage a = auctions[id];
        require(block.timestamp >= a.revealDeadline, "reveal window still open");
        require(!a.finalized, "already finalized");
        a.finalized = true;

        uint256 sellerProceeds = a.highestBid;

        for (uint256 i = 0; i < a.bidders.length; i++) {
            address bidder = a.bidders[i];

            if (!revealed[id][bidder]) {
                sellerProceeds += a.depositCap; // forfeited, no-show penalty
                continue;
            }

            if (bidder == a.highestBidder) {
                uint256 refund = a.depositCap - a.highestBid;
                if (refund > 0) payable(bidder).transfer(refund);
            } else {
                payable(bidder).transfer(a.depositCap);
            }
        }

        if (sellerProceeds > 0) {
            payable(a.seller).transfer(sellerProceeds);
        }

        emit AuctionFinalized(id, a.highestBidder, a.highestBid);
    }

    function getAuction(uint256 id)
        external
        view
        returns (
            address seller,
            string memory item,
            uint256 depositCap,
            uint256 commitDeadline,
            uint256 revealDeadline,
            bool finalized,
            address highestBidder,
            uint256 highestBid,
            uint256 bidderCount
        )
    {
        AuctionData storage a = auctions[id];
        return (
            a.seller,
            a.item,
            a.depositCap,
            a.commitDeadline,
            a.revealDeadline,
            a.finalized,
            a.highestBidder,
            a.highestBid,
            a.bidders.length
        );
    }
}
