# Sealed-Bid Auction

> **Disclaimer / 免责声明:** Personal testing only, no warranties, use at your own risk — the author is not
> liable for any loss. 仅供个人测试使用,不作任何承诺,风险自负,由此造成的任何损失作者概不负责。

A commit-reveal sealed-bid auction settled in native USDC on [Arc Testnet](https://docs.arc.io). Standalone
Hardhat + TypeScript project, independent from the rest of this repo.

## Why commit-reveal, not Arc's confidential contracts

Arc has a privacy feature on its roadmap — Arc Privacy Sector (APS): an opt-in confidential execution
environment where encrypted transactions run inside hardware enclaves, with function-level Open/Restricted/
Locked access control via a trust-domain API (`addTrustee`). It would be the "real" way to hide bid amounts.
It isn't available yet — the docs say so explicitly: *"Privacy features are on the roadmap and not yet
available on Arc"* (`docs.arc.io/arc/concepts/opt-in-privacy`).

So this uses the classic alternative instead: **commit-reveal**. Bidders submit `keccak256(amount, salt,
address)` during a commit window; nobody can derive the bid from the hash. During the following reveal
window, they disclose `amount` and `salt`, the contract checks the hash matches, and the highest valid
reveal wins. The one trap this design specifically avoids: if a bidder's *deposit* were their real bid
amount, the value locked at commit time would leak the bid before reveal. Instead every bidder locks the
same fixed `depositCap`, so the deposit itself carries no information — only the eventual reveal does.

## Contract (`contracts/SealedBidAuction.sol`)

- `createAuction(item, depositCap, commitWindow, revealWindow)` — seller opens an auction.
- `commitBid(id, hash)` — bidder locks `depositCap` in native USDC with their sealed bid hash.
- `revealBid(id, amount, salt)` — bidder discloses their real bid; rejected if it doesn't match their commitment.
- `finalizeAuction(id)` — callable by anyone once the reveal window closes. The highest revealed bid wins:
  the winner pays the seller their bid and gets the rest of their deposit back; other revealed bidders get
  a full refund; bidders who committed but never revealed forfeit their entire deposit to the seller as a
  no-show penalty.

## Setup

```bash
npm install
cp .env.example .env
```

Set `PRIVATE_KEY` (seller/deployer) and `BIDDER_PRIVATE_KEY` (a second wallet, for `scripts/demo.ts`) —
both need testnet USDC for gas; the bidder also needs at least `depositCap` to bid. Fund from the
[Circle faucet](https://faucet.circle.com), or transfer some from an already-funded wallet.

```bash
npm run compile
npm test              # 8 passing tests, local Hardhat network
npm run deploy         # deploy to Arc Testnet, copy the address into .env as AUCTION_ADDRESS
npm run demo           # runs a full commit -> wait -> reveal -> wait -> finalize cycle live
```

`demo.ts` uses short 30-second commit/reveal windows so the whole cycle finishes in about a minute and a
half — real auctions would use much longer windows.

## Verified

All 8 local tests pass (full auction happy path, winner's unused-deposit refund, no-show forfeiture, and
five rejection cases: late commit, wrong deposit amount, mismatched reveal, early finalize, double finalize).

Also run live end-to-end on Arc Testnet:

- Contract: [`0x6ebD4dBb45a124f2ff1B209C4Be186B5F4Eec334`](https://testnet.arcscan.app/address/0x6ebD4dBb45a124f2ff1B209C4Be186B5F4Eec334)
- Full cycle: [createAuction](https://testnet.arcscan.app/tx/0x3dc0aae4f53e8bafd53f65003674d59b5dd911aabf8c7cd4c92c0509c07a66e8) → [commitBid](https://testnet.arcscan.app/tx/0x8b069f0651c8016442b76d4c4c38032f3a1f5983b17e1ad42260fe7cb75ad76a) → [revealBid](https://testnet.arcscan.app/tx/0x7fdc74eb300a4f5b42adc2534dd6d1da5dd9caada5547738156a905b1ef44c5d) → [finalizeAuction](https://testnet.arcscan.app/tx/0xb054820c42fd56c6531ffa2e25ae8eb5ac91dca84e682dc5ff1a99d88b87c6ce)
- Bid of 0.015 USDC against a 0.02 USDC deposit cap won (sole bidder); seller received the winning bid, bidder got the 0.005 USDC unused-deposit refund back — confirmed via on-chain balance reads before/after.
- Not exercised live: the competing-bidders comparison (highest-of-several-reveals) and the no-show forfeiture path. Both are covered by the local test suite; the live run used a single bidder to keep it cheap and simple.
