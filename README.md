# Arc Starter Kit

Minimal Hardhat + TypeScript starter for deploying and monitoring smart contracts on
[Arc Testnet](https://docs.arc.io) — Circle's stablecoin-native, EVM-compatible L1 where USDC is the native gas token.

## What's inside

- `contracts/PaymentLog.sol` — a tiny on-chain ledger that records payments and emits a `PaymentRecorded` event, modeling Arc's peer-to-peer payments use case.
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

## Verified deployment

The full deploy → transact → watch loop has been run end-to-end on Arc Testnet:

- Contract: [`0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`](https://testnet.arcscan.app/address/0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5)
- Example transaction: [`0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad`](https://testnet.arcscan.app/tx/0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad)
- `npm run watch` printed the corresponding `PaymentRecorded` event in real time.
- `npm run send` moved 0.10 USDC from `0x4dEF...EC8bc` to `0x7D4F...561Fe` via App Kit: [`0x1b2c0c8f...db25a9e`](https://testnet.arcscan.app/tx/0x1b2c0c8f44ac4fc34b3092bb3da57d8f4724388700e4d1f833204df34db25a9e).
- `npm run balance` successfully calls App Kit's Gateway balance API and returns a real per-chain breakdown. It reads `0` everywhere because Unified Balance tracks funds explicitly deposited into Gateway via `kit.unifiedBalance.deposit()` — a separate step from holding USDC in the wallet directly (which is what `send` uses).
- `npm run bridge` reaches App Kit's on-chain balance check and correctly reports `BALANCE_INSUFFICIENT_TOKEN` (the wallet has no USDC on Base Sepolia yet). Code path verified; a live cross-chain transfer is pending source-chain funding.

## Next steps

- Call `recordPayment(to, amount, memo)` from a script or Arcscan's "Write Contract" tab to see events flow through `npm run watch`.
- Call `kit.unifiedBalance.deposit()` to actually fund the Gateway balance, then re-run `npm run balance` to see it reflected.
- Fund the deployer wallet with testnet USDC on Base Sepolia (same address, [Circle faucet](https://faucet.circle.com)) and re-run `npm run bridge` for a full live cross-chain transfer.
- See [docs.arc.io](https://docs.arc.io) for App Kit's Bridge/Swap/Send/Unified Balance kits and the Arc MCP server for AI-agent integrations.
