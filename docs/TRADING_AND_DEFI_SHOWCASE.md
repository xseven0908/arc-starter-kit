> [!CAUTION]
> **Disclaimer / 免责声明**
> The following community post templates and linked repositories are for personal testing, education, and Arc Testnet experimentation only. They are unaudited, provided "as is" without warranties of any kind, and must not be used with real mainnet assets or relied upon for financial, trading, or investment decisions.
> 以下社区发帖模板及关联代码库仅供个人测试、教育与 Arc Testnet 实验使用，未经安全审计，按“原样”提供，不构成任何投资或财务建议，严禁用于主网真实资金。

# Arc House — "Trading & DeFi" Club Showcase Posts

Ready-to-publish prototype showcase posts tailored to the **Arc House Trading & DeFi Club** (`https://community.arc.io/home/clubs/trading-and-defi`), following every disclosure requirement in Timothy Baker's pinned guide (*Welcome to Trading & DeFi on Arc. Here's what to post*):
- Explicit **Network & Stage** (`Arc Testnet Prototype`, Chain ID `5042002`)
- Full **Contract Addresses & Explorer Transaction Links**
- Explicit **Affiliation & Token Disclosure** (Independent open-source builder, no custom token promoted)
- Clear **Architecture Decisions, Security Tradeoffs & Known Limitations**

---

## Post 1: Market Structure — O(1) Commit-Reveal Sealed-Bid Auction in Native USDC

**Suggested Club Tags:** `# Market Structure` `# DeFi` `# Trading` `# USDC` `# Arc`  
**Title:** `[Testnet Prototype] Designing a Native-USDC Sealed-Bid Auction on Arc: Fixed Deposit Caps, O(1) Finalization, and Pull-Payment DoS Immunity`

### Body

> **Disclosure & Stage:** Independent open-source prototype on **Arc Testnet** (Chain ID `5042002`). Unaudited, educational/research use only, no custom token, no affiliation or paid promotion.

While exploring market structures in the **Trading & DeFi** club, most discussions focus on continuous AMMs, concentrated liquidity, or RFQ orderbooks. I wanted to explore another classic price-discovery mechanism on Arc: **onchain sealed-bid auctions settled directly in native USDC**.

Repository: **https://github.com/xseven0908/arc-sealed-bid-auction** (`v0.2.0`, MIT License)

#### 1. Two Traps in Naive Commit-Reveal Auctions
Because Arc's confidential execution environment (Arc Privacy Sector / APS) is still on the future roadmap, onchain sealed-bid auctions must use **commit-reveal**. However, naive Solidity implementations usually fail in two ways:
1. **Bid-Size Leakage at Commit Time:** If a bidder locks `msg.value == bidAmount` during the commit phase, anyone watching the chain immediately knows their bid before the reveal window opens.
   - **Our Fix:** Every bidder locks the exact same fixed `depositCap` in native USDC alongside `keccak256(abi.encodePacked(amount, salt, bidderAddress))`. The deposit size reveals zero information about the bid.
2. **Push-Payment Griefing / DoS in `finalizeAuction`:** In our `v0.1` prototype, `finalizeAuction` looped over `bidders[]` and pushed refunds via `.transfer()`. A single malicious bidder contract whose `receive()` reverts could cause `finalizeAuction` to revert for everyone—permanently locking all auction funds.
   - **Our Fix in `v0.2.0`:** We refactored `finalizeAuction(id)` to **O(1) constant gas**:
     - `finalizeAuction` only records `unrevealedCount = commitCount - revealedCount` and `sellerProceeds = highestBid + (unrevealedCount * depositCap)`.
     - Losing revealed bidders and the winner (for `depositCap - highestBid`) pull their refunds independently via `claimRefund(id)`.
     - The seller pulls proceeds via `claimProceeds(id)`.
     - Tie-breaking is deterministic: strict inequality (`amount > highestBid`, first-reveal-wins).

#### 2. Verified Arc Testnet Evidence
- **Deployed Contract (v0.1 baseline on Arc Testnet):** [`0x6ebD4dBb45a124f2ff1B209C4Be186B5F4Eec334`](https://testnet.arcscan.app/address/0x6ebD4dBb45a124f2ff1B209C4Be186B5F4Eec334)
- **End-to-End Testnet Lifecycle Transactions:**
  - `createAuction`: [`0x3dc0aae4...c07a66e8`](https://testnet.arcscan.app/tx/0x3dc0aae4f53e8bafd53f65003674d59b5dd911aabf8c7cd4c92c0509c07a66e8)
  - `commitBid` (`0.02 USDC` fixed deposit cap): [`0x8b069f06...75ad76a`](https://testnet.arcscan.app/tx/0x8b069f0651c8016442b76d4c4c38032f3a1f5983b17e1ad42260fe7cb75ad76a)
  - `revealBid` (`0.015 USDC` true bid): [`0x7fdc74eb...1ef44c5d`](https://testnet.arcscan.app/tx/0x7fdc74eb300a4f5b42adc2534dd6d1da5dd9caada5547738156a905b1ef44c5d)
  - `finalizeAuction`: [`0xb054820c...87c6ce`](https://testnet.arcscan.app/tx/0xb054820c42fd56c6531ffa2e25ae8eb5ac91dca84e682dc5ff1a99d88b87c6ce)

#### 3. Known Limitations & Questions for Builders
- Unrevealed commitments forfeit their `depositCap` to the seller to deter free-option griefing, which means honest bidders must stay online during the reveal window.
- Once Arc Privacy Sector (APS) becomes available on Testnet, how do you envision combining enclave-encrypted bids with public settlement finality?

---

## Post 2: Vaults, Escrow & Atomic USDC ↔ EURC FX PvP Settlement

**Suggested Club Tags:** `# Swaps` `# Yield` `# Liquidity` `# DeFi` `# Payments`  
**Title:** `[Testnet Prototype] Native-USDC Share Vaults, Timeout Escrows, and Atomic USDC ↔ EURC PvP Settlement on Arc`

### Body

> **Disclosure & Stage:** Independent open-source reference kit on **Arc Testnet** (Chain ID `5042002`). Unaudited, for education and testing only, no custom token promoted.

Because USDC is the native gas asset on Arc (`18` decimals natively) while ecosystem stablecoins like `EURC` (`0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`) use `6`-decimal ERC-20 interfaces, building DeFi and payment primitives on Arc looks slightly different from standard Ethereum L2s.

Repository: **https://github.com/xseven0908/arc-starter-kit** (`v0.2.0`, MIT License)

#### What We Built & Verified
1. **Single-Asset Native USDC Share Vault (`SavingsPool.sol`)**:
   - Models ERC-4626 proportional share accounting (`totalShares` and internal `totalAssets`) directly over native `payable` USDC without requiring a wrapped ERC-20 share token.
   - Deployed on Arc Testnet: [`0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069`](https://testnet.arcscan.app/address/0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069) ([deposit tx](https://testnet.arcscan.app/tx/0xe27e11ac298bc1c5e0fc9851369bb53c83c2f069e0f128aab33d0b962d0689ed), [fundRewards tx](https://testnet.arcscan.app/tx/0x86ee5c5ffaf5722118d7d23f205297e963c418c05f7309b57a73849587a8e4c5), [withdraw tx](https://testnet.arcscan.app/tx/0xe5ad08d937bd14542201ce68c5ef40b2b632e6f915452ac6bcc4c2d520acb821)).
2. **Atomic RFQ FX Payment-versus-Payment (`AtomicFxPvP.sol`)**:
   - Eliminates Herstatt/settlement risk between `18`-decimal native USDC and `6`-decimal `EURC`. A Maker locks native USDC in a quote with an expiry and optional Taker address; when the Taker calls `fillQuote(id)`, the contract pulls `EURC` directly to the Maker and releases native USDC to the Taker in one atomic transaction.
3. **Push-to-Pull Fallback in `Invoice.sol` and `Escrow.sol`**:
   - Deployed `Invoice`: [`0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed`](https://testnet.arcscan.app/address/0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed)
   - Deployed `Escrow` (7-day timeout reclaim): [`0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D`](https://testnet.arcscan.app/address/0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D)
   - In `v0.2.0`, if a smart-contract recipient rejects a direct push transfer during settlement, funds are automatically queued in `pendingWithdrawals` rather than reverting the settlement state machine.

---

## Post 3: Empirical Fee Benchmarks & Dual-Decimal USDC/EURC Reconciliation

**Suggested Club Tags:** `# Risk Analysis` `# Blockchain Infrastructure` `# DeFi` `# USDC`  
**Title:** `[Research & Tooling] Measuring Real USDC Operation Costs on Arc & Reconciling 18-Dec Native USDC vs. 6-Dec EURC`

### Body

> **Disclosure & Stage:** Independent open-source research and infrastructure toolkits on **Arc Testnet** (Chain ID `5042002`). Unaudited, Testnet estimates do not represent mainnet guarantees.

Two practical questions come up repeatedly when building financial apps on Arc:
1. **What do common DeFi and payment operations actually cost in dollar terms at P50/P95/P99 base fees?**
2. **How do you index and reconcile 18-decimal EIP-7708 native USDC transfers alongside 6-decimal EURC and onchain Memo events without double-counting or silent precision loss?**

We open-sourced two companion repositories to address both:

1. **Arc Fee Lab (`v0.2.0`)** — **https://github.com/xseven0908/arc-fee-lab**
   - Checkpointed sequential block sampler, missing/duplicate block continuity verifier, and realized receipt priority-fee analyzer.
   - Outputs reproducible JSON, CSV, Markdown, and standalone HTML benchmark reports across 10 operations:
     - Native USDC Transfer (`21,000` gas)
     - `Invoice.payInvoice` (`46,800` gas)
     - `SealedBidAuction.finalizeAuction` O(1) (`48,100` gas)
     - `SavingsPool.deposit` / `withdraw` (`68,900` / `59,300` gas)
     - `AtomicFxPvP.fillQuote` USDC ↔ EURC (`96,500` gas)
2. **Arc Payment Ops (`v0.2.0`)** — **https://github.com/xseven0908/arc-payment-ops**
   - Durable `node:sqlite` checkpoint indexer for EIP-7708 native USDC (`0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE`), `EURC`, and `Memo` (`0x5294E9927c3306DcBaDb03fe70b92e01cCede505`).
   - Normalizes 18-decimal native USDC to 6-decimal accounting units (throwing explicitly on sub-micro dust rather than silently truncating), correlates UTF-8 Memo order IDs within the same transaction, and exposes a 4-state CSV/JSON reconciler (`matched`, `missing`, `duplicate`, `amount_mismatch`) with an operator dashboard and Prometheus `/metrics`.
