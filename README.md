> [!CAUTION]
> **Disclaimer / 免责声明**
> This project is for personal testing, education, and Arc Testnet experimentation only. It is unaudited, not production-ready, provided "as is" with no warranties or guarantees of any kind, and interacts with real testnet funds. Do not use with real mainnet assets or rely on it for financial, business, or trust decisions. The author accepts no responsibility or liability for any loss or damage arising from its use.
> 本项目仅供个人测试、教育与 Arc Testnet 实验使用，未经安全审计，不适用于生产环境或真实资产，不提供任何形式的保证或承诺，且会与真实的测试网资金交互。因使用本项目而产生的任何直接或间接损失或损害，作者概不负责。

# Arc Starter Kit (v0.2.0)

[![CI](https://github.com/xseven0908/arc-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/xseven0908/arc-starter-kit/actions/workflows/ci.yml)
[![Arc Testnet](https://img.shields.io/badge/network-Arc%20Testnet-6c5ce7)](https://docs.arc.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Full-stack Hardhat + TypeScript reference lab for deploying, testing, and operating payment, escrow, yield-vault, and atomic FX settlement contracts on [Arc Testnet](https://docs.arc.io) — Circle's stablecoin-native, EVM-compatible L1 where USDC is the native gas token.

See [Architecture](docs/architecture.md), [Security Model & Tradeoffs](docs/security-model.md), [Deployed Manifest](deployments/arc-testnet.json), and [Roadmap](ROADMAP.md).

## What's inside

### Onchain Primitives (`contracts/`)
- `contracts/PaymentLog.sol` — a compact on-chain ledger that records payments and emits `PaymentRecorded` events, modeling peer-to-peer and agent-tagged payment audit trails.
- `contracts/Invoice.sol` — sellers issue invoices, buyers pay them in native USDC (`payable`/`msg.value`, no ERC-20 approval needed). Hardened in v0.2 with reentrancy protection, ID bounds validation, and pull-payment fallback (`withdrawProceeds()`) if a contract seller rejects direct native push transfers.
- `contracts/Escrow.sol` — depositor locks native USDC for a recipient; release on confirmation, refund voluntarily, or reclaim after a 7-day timeout. Hardened in v0.2 with `nonReentrant` and pull-payment fallback (`claimPending()`).
- `contracts/SavingsPool.sol` — single-asset native USDC vault using ERC-4626-style share accounting (`totalShares` and internal `totalAssets`); deposit mints shares, `fundRewards()` raises share redemption value, and `withdraw()` redeems principal + yield. *(Educational ERC-4626-style native vault, not a collateralized lending market.)*
- `contracts/AtomicFxPvP.sol` *(new in v0.2)* — atomic Request-for-Quote (RFQ) Payment-versus-Payment (PvP) settlement between native 18-decimal USDC and 6-decimal ERC-20 stablecoins (such as Arc Testnet `EURC`), eliminating settlement/Herstatt risk in a single transaction.

### Circle App Kit Scripts (`scripts/`)
- `scripts/deploy*.ts` — deploys each contract to Arc Testnet via Hardhat/ethers.
- `scripts/watch-events.ts` — standalone [viem](https://viem.sh) script that watches `PaymentRecorded` events in real time.
- `scripts/send-payment.ts` — moves real testnet USDC using Circle's [App Kit](https://docs.arc.io/app-kit) (`@circle-fin/app-kit`), no browser wallet or Circle API key required.
- `scripts/unified-balance.ts` — queries a wallet's aggregated USDC balance across chains via App Kit's Unified Balance (Gateway) module.
- `scripts/bridge-payment.ts` — bridges testnet USDC from another chain (default Base Sepolia) into Arc via App Kit's `bridge()` (CCTP under the hood).

### Full-Stack Packages & Tests
- `test/` — **27 passing Hardhat unit & security tests** covering happy paths, access control, bounds checks, malicious reverting-receiver DoS resistance, multi-user share conservation, and atomic USDC/EURC FX PvP swaps.
- `frontend/` — Vite + React + TypeScript dApp (`wagmi` + `viem` + `ConnectKit`) wired to the deployed Arc Testnet contracts.
- `agent/` — local [MCP](https://modelcontextprotocol.io) server exposing guarded payment tools (`get_balance`, `send_payment`, `list_recent_payments`) under a per-call spending cap (`SPEND_CAP_USDC`) and recipient `ALLOWLIST`.

## Network details (Arc Testnet)

| | |
|---|---|
| Chain ID | `5042002` |
| RPC (primary) | `https://rpc.testnet.arc.network` / `https://rpc.testnet.arc.io` |
| Block explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |
| Native gas token | USDC (18 decimals) |
| Ecosystem EURC (ERC-20) | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (6 decimals) |

## Setup & Usage

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `PRIVATE_KEY` to a testnet-only wallet's private key. Fund that wallet with testnet USDC from the [Circle faucet](https://faucet.circle.com) — USDC pays for gas on Arc.

```bash
# Compile contracts & generate TypeChain types
npm run compile

# Type-check scripts & tests
npm run typecheck

# Run all 27 unit & security tests (local Hardhat network)
npm test

# Deploy contracts to Arc Testnet
npm run deploy
npm run deploy:invoice
npm run deploy:escrow
npm run deploy:savings
npm run deploy:fx

# Watch PaymentRecorded events live
npm run watch

# Circle App Kit operations
npm run send
npm run balance
npm run bridge
```

## Verified deployment (Arc Testnet)

Machine-readable deployment metadata is tracked in [`deployments/arc-testnet.json`](deployments/arc-testnet.json):

- **PaymentLog**: [`0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`](https://testnet.arcscan.app/address/0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5) — [example tx](https://testnet.arcscan.app/tx/0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad)
- **Invoice**: [`0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed`](https://testnet.arcscan.app/address/0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed) — [create](https://testnet.arcscan.app/tx/0x059d469bf7252007772740011e66c6e889b5ddcd917e2a9bb49fa6ebb1be55b3), [pay](https://testnet.arcscan.app/tx/0x419f86b73007f5714b564938bee05c05420b44c953cacc1b2ec64b105705ce4d)
- **Escrow**: [`0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D`](https://testnet.arcscan.app/address/0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D) — [open](https://testnet.arcscan.app/tx/0x1fbf3780cbb30c76a2ff40843fa1c022cd1a88a0b734813c762f23c9c3914366), [release](https://testnet.arcscan.app/tx/0xc531f8708d99c2a9f02d240b8f824fa3257b64529f5406c9d545025967d200ac)
- **SavingsPool**: [`0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069`](https://testnet.arcscan.app/address/0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069) — [deposit](https://testnet.arcscan.app/tx/0xe27e11ac298bc1c5e0fc9851369bb53c83c2f069e0f128aab33d0b962d0689ed), [fundRewards](https://testnet.arcscan.app/tx/0x86ee5c5ffaf5722118d7d23f205297e963c418c05f7309b57a73849587a8e4c5), [withdraw](https://testnet.arcscan.app/tx/0xe5ad08d937bd14542201ce68c5ef40b2b632e6f915452ac6bcc4c2d520acb821)
- **App Kit `send()`**: [`0x1b2c0c8f...db25a9e`](https://testnet.arcscan.app/tx/0x1b2c0c8f44ac4fc34b3092bb3da57d8f4724388700e4d1f833204df34db25a9e)
