# Hi, I'm [@xseven0908](https://github.com/xseven0908)

Builder focused on **Arc Testnet** (Circle's stablecoin-native L1 where USDC is the native gas token), programmable stablecoin settlement, DeFi market microstructure, payment observability, and the ERC-8004 / ERC-8183 agentic economy.

> **Disclaimer / 免责声明:** All repositories below are open-source research and Arc Testnet prototypes provided "as is" without warranties of any kind. Unaudited and not for production or mainnet financial use. 以下所有仓库均为开源研究与 Arc Testnet 实验原型，未经安全审计，按“原样”提供，不适用于生产环境或真实资金。

---

## Arc Ecosystem Portfolio (5 Verified Repositories)

| Repository | Release | Domain & Focus | Verified Onchain / Engineering Highlights | CI |
| :--- | :---: | :--- | :--- | :---: |
| **[arc-starter-kit](https://github.com/xseven0908/arc-starter-kit)** | `v0.2.0` | **Payments, Vaults, Escrow & FX PvP Reference Lab** | 5 Solidity contracts (`PaymentLog`, `Invoice`, `Escrow`, `SavingsPool` ERC-4626 share vault, `AtomicFxPvP` native USDC ↔ EURC RFQ PvP) with pull-payment DoS fallbacks, Circle App Kit scripts, React/wagmi dApp, guarded MCP agent, and 27 tests. | ![CI](https://github.com/xseven0908/arc-starter-kit/actions/workflows/ci.yml/badge.svg) |
| **[arc-sealed-bid-auction](https://github.com/xseven0908/arc-sealed-bid-auction)** | `v0.2.0` | **DeFi Market Structure — Commit-Reveal Auction** | Fixed-deposit (`depositCap`) sealed-bid auction in native USDC with **O(1) finalization** and pull-payment claims (`claimRefund` / `claimProceeds`), immune to reverting-receiver DoS and gas exhaustion. | ![CI](https://github.com/xseven0908/arc-sealed-bid-auction/actions/workflows/ci.yml/badge.svg) |
| **[arc-payment-ops](https://github.com/xseven0908/arc-payment-ops)** | `v0.2.0` | **Payment Indexing, Memo Correlation & Reconciliation** | Durable SQLite checkpoint indexer for EIP-7708 native USDC (18-dec), EURC (6-dec), and Memo logs; multi-RPC failover with health scoring; CSV/JSON 4-state reconciler; operator dashboard & Prometheus `/metrics`. | ![CI](https://github.com/xseven0908/arc-payment-ops/actions/workflows/ci.yml/badge.svg) |
| **[arc-agent-work-market](https://github.com/xseven0908/arc-agent-work-market)** | `v0.8.0` | **ERC-8004 Identity & ERC-8183 Agentic Commerce** | Proof-backed agent reputation where only independently verified onchain ERC-8183 settlements count; SQLite event indexer (identity, jobs, reputation feedback); `Idempotency-Key` protection & capability discovery API. | ![CI](https://github.com/xseven0908/arc-agent-work-market/actions/workflows/ci.yml/badge.svg) |
| **[arc-fee-lab](https://github.com/xseven0908/arc-fee-lab)** | `v0.2.0` | **Stable Fee & DeFi Cost Benchmark Research** | Checkpointed sequential block sampler, block-continuity checker, realized receipt priority-fee analyzer, and P50/P95/P99 USDC cost benchmarks across 10 Arc DeFi & payment operations (JSON/CSV/MD/HTML reports). | ![CI](https://github.com/xseven0908/arc-fee-lab/actions/workflows/ci.yml/badge.svg) |

---

## Verified Arc Testnet Deployments & Onchain Evidence

- **`PaymentLog`**: [`0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`](https://testnet.arcscan.app/address/0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5)
- **`Invoice` (Payable Native USDC)**: [`0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed`](https://testnet.arcscan.app/address/0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed)
- **`Escrow` (7-Day Timeout & Confirm Release)**: [`0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D`](https://testnet.arcscan.app/address/0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D)
- **`SavingsPool` (Single-Asset Share Vault)**: [`0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069`](https://testnet.arcscan.app/address/0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069)
- **`SealedBidAuction` (Commit-Reveal)**: [`0x6ebD4dBb45a124f2ff1B209C4Be186B5F4Eec334`](https://testnet.arcscan.app/address/0x6ebD4dBb45a124f2ff1B209C4Be186B5F4Eec334)
- **ERC-8004 Identities & ERC-8183 Settlement**: Client Identity `895667`, Provider Identity `895668`, Completed Job `186575` ([settlement tx `0x9d290a...57ea5`](https://explorer.testnet.arc.io/tx/0x9d290a0a4f2f3ca0d47dc94fff8c3f653e42d5b3bbb695102941259963957ea5))
