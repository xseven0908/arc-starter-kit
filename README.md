> **Disclaimer / 免责声明**
> This project is for personal testing and learning purposes only. It is provided "as is," with no warranties or guarantees of any kind, and interacts with real testnet funds. The author accepts no responsibility or liability for any loss or damage arising from its use.
> 本项目仅供个人测试与学习使用,不提供任何形式的保证或承诺,且会与真实的测试网资金交互。因使用本项目而产生的任何损失或损害,作者概不负责。

# Arc Starter Kit

[![CI](https://github.com/xseven0908/arc-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/xseven0908/arc-starter-kit/actions/workflows/ci.yml)

Minimal Hardhat + TypeScript starter for deploying and monitoring smart contracts on
[Arc Testnet](https://docs.arc.io) — Circle's stablecoin-native, EVM-compatible L1 where USDC is the native gas token.

## What's inside

- `contracts/PaymentLog.sol` — a tiny on-chain ledger that records payments and emits a `PaymentRecorded` event, modeling Arc's peer-to-peer payments use case.
- `contracts/Invoice.sol` — sellers issue invoices, buyers pay them in native USDC (`payable`/`msg.value`, no ERC-20 approval needed) — models e-commerce settlement, with 5 passing tests.
- `contracts/Escrow.sol` — depositor locks native USDC for a recipient; release on confirmation, refund voluntarily, or reclaim after a 7-day timeout — models "pay on confirmation" p2p payments, with 6 passing tests.
- `contracts/SavingsPool.sol` — single-asset native USDC vault using ERC-4626-style share accounting; deposit mints shares, anyone can top up rewards to raise share value, withdraw redeems principal + yield — with 5 passing tests. (Not a collateralized lending market: Arc's native asset *is* USDC, so borrowing would need a second token; this models the deposit/yield side only.)
- `scripts/deploy.ts` — deploys the contract to Arc Testnet via Hardhat/ethers.
- `scripts/watch-events.ts` — a standalone [viem](https://viem.sh) script that watches `PaymentRecorded` events in real time.
- `scripts/send-payment.ts` — moves real testnet USDC using Circle's [App Kit](https://docs.arc.io/app-kit) (`@circle-fin/app-kit`), no browser wallet or Circle API key required.
- `scripts/unified-balance.ts` — queries a wallet's aggregated USDC balance across chains via App Kit's Unified Balance (Gateway) module.
- `scripts/bridge-payment.ts` — bridges testnet USDC from another chain (default Base Sepolia) into Arc via App Kit's `bridge()` (CCTP under the hood). Needs USDC on the source chain to run for real — see [Verified deployment](#verified-deployment).
- `test/PaymentLog.test.ts` — a Hardhat test for the contract.

## Network details (Arc Testnet)

| | |
|---|---|
| Chain ID | `5042002` |
| RPC (primary) | `https://rpc.testnet.arc.io` |
| Block explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |
| Native gas token | USDC (18 decimals) |

Alternate RPC providers: Blockdaemon, dRPC, QuickNode — see [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `PRIVATE_KEY` to a testnet-only wallet's private key. Fund that wallet with
testnet USDC from the [Circle faucet](https://faucet.circle.com) — USDC pays for gas on Arc.

## Usage

```bash
# Compile contracts
npm run compile

# Run tests (local Hardhat network)
npm test

# Deploy PaymentLog to Arc Testnet
npm run deploy
# -> copy the printed address into .env as CONTRACT_ADDRESS

# Deploy Invoice to Arc Testnet
npm run deploy:invoice

# Deploy Escrow to Arc Testnet
npm run deploy:escrow

# Deploy SavingsPool to Arc Testnet
npm run deploy:savings

# Watch PaymentRecorded events live
npm run watch

# Send real testnet USDC via App Kit (set RECIPIENT_ADDRESS in .env first)
npm run send

# Query aggregated USDC balance across chains via Unified Balance
npm run balance

# Bridge testnet USDC from Base Sepolia into Arc (needs USDC on the source chain)
npm run bridge
```

Verify your deployment on [Arcscan](https://testnet.arcscan.app) using the address printed by `deploy`.

### App Kit send

`scripts/send-payment.ts` uses `createViemAdapterFromPrivateKey` (from `@circle-fin/adapter-viem-v2/next`)
to sign locally with the same private key from `.env`, then calls `AppKit#send()` to move real USDC on
`Arc_Testnet` — no browser extension and no Circle-hosted wallet required. This is the "send" building
block from Circle's four App Kit modules (Send, Bridge, Swap, Unified Balance); see [Next steps](#next-steps)
for the others.

## Frontend

`frontend/` is a Vite + React + TypeScript dApp (wagmi + viem + ConnectKit) for all four contracts —
connect a wallet, see your balance, and call each contract from a form. See `frontend/README.md` for setup.
Build and type-check are verified; interactive browser testing with a live wallet is still outstanding
(Chrome browser tools weren't available in the session it was built in).

## Verified deployment

The full deploy → transact → watch loop has been run end-to-end on Arc Testnet:

- Contract: [`0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`](https://testnet.arcscan.app/address/0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5)
- Example transaction: [`0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad`](https://testnet.arcscan.app/tx/0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad)
- `npm run watch` printed the corresponding `PaymentRecorded` event in real time.
- `npm run send` moved 0.10 USDC from `0x4dEF...EC8bc` to `0x7D4F...561Fe` via App Kit: [`0x1b2c0c8f...db25a9e`](https://testnet.arcscan.app/tx/0x1b2c0c8f44ac4fc34b3092bb3da57d8f4724388700e4d1f833204df34db25a9e).
- `npm run balance` successfully calls App Kit's Gateway balance API and returns a real per-chain breakdown. It reads `0` everywhere because Unified Balance tracks funds explicitly deposited into Gateway via `kit.unifiedBalance.deposit()` — a separate step from holding USDC in the wallet directly (which is what `send` uses).
- `npm run bridge` reaches App Kit's on-chain balance check and correctly reports `BALANCE_INSUFFICIENT_TOKEN` against a live RPC call. The wallet was funded with 20 USDC on Base Sepolia via the Circle faucet, but no Base Sepolia ETH for gas — the faucets that offer it gate behind a mainnet ETH balance requirement, so a full live transfer (burn + mint) hasn't been exercised. Code path and error handling are verified; this is the one script in the kit that's untested end-to-end.
- Invoice: [`0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed`](https://testnet.arcscan.app/address/0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed) — created and paid a 0.05 USDC invoice: [create](https://testnet.arcscan.app/tx/0x059d469bf7252007772740011e66c6e889b5ddcd917e2a9bb49fa6ebb1be55b3), [pay](https://testnet.arcscan.app/tx/0x419f86b73007f5714b564938bee05c05420b44c953cacc1b2ec64b105705ce4d) (same address as both seller and payer in this demo, for simplicity).
- Escrow: [`0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D`](https://testnet.arcscan.app/address/0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D) — opened and released 0.2 USDC to a separate recipient address: [open](https://testnet.arcscan.app/tx/0x1fbf3780cbb30c76a2ff40843fa1c022cd1a88a0b734813c762f23c9c3914366), [release](https://testnet.arcscan.app/tx/0xc531f8708d99c2a9f02d240b8f824fa3257b64529f5406c9d545025967d200ac).
- SavingsPool: [`0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069`](https://testnet.arcscan.app/address/0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069) — deposited 0.5 USDC, funded 0.1 USDC in rewards, and confirmed the redeemable balance correctly rose to 0.6 before withdrawing: [deposit](https://testnet.arcscan.app/tx/0xe27e11ac298bc1c5e0fc9851369bb53c83c2f069e0f128aab33d0b962d0689ed), [fundRewards](https://testnet.arcscan.app/tx/0x86ee5c5ffaf5722118d7d23f205297e963c418c05f7309b57a73849587a8e4c5), [withdraw](https://testnet.arcscan.app/tx/0xe5ad08d937bd14542201ce68c5ef40b2b632e6f915452ac6bcc4c2d520acb821).

## Next steps

- Call `recordPayment(to, amount, memo)` from a script or Arcscan's "Write Contract" tab to see events flow through `npm run watch`.
- Call `kit.unifiedBalance.deposit()` to actually fund the Gateway balance, then re-run `npm run balance` to see it reflected.
- Fund the deployer wallet with testnet USDC on Base Sepolia (same address, [Circle faucet](https://faucet.circle.com)) and re-run `npm run bridge` for a full live cross-chain transfer.
- See [docs.arc.io](https://docs.arc.io) for App Kit's Bridge/Swap/Send/Unified Balance kits and the Arc MCP server for AI-agent integrations.
