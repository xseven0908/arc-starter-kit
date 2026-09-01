# Arc Starter Kit

Minimal Hardhat + TypeScript starter for deploying and monitoring smart contracts on
[Arc Testnet](https://docs.arc.io) — Circle's stablecoin-native, EVM-compatible L1 where USDC is the native gas token.

## What's inside

- `contracts/PaymentLog.sol` — a tiny on-chain ledger that records payments and emits a `PaymentRecorded` event, modeling Arc's peer-to-peer payments use case.
- `scripts/deploy.ts` — deploys the contract to Arc Testnet via Hardhat/ethers.
- `scripts/watch-events.ts` — a standalone [viem](https://viem.sh) script that watches `PaymentRecorded` events in real time.
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
```

Verify your deployment on [Arcscan](https://testnet.arcscan.app) using the address printed by `deploy`.

## Verified deployment

The full deploy → transact → watch loop has been run end-to-end on Arc Testnet:

- Contract: [`0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`](https://testnet.arcscan.app/address/0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5)
- Example transaction: [`0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad`](https://testnet.arcscan.app/tx/0x0d7359c8bc22f4a05973f72519c54bd25b625414e3e0b0afcd9ebc56fa02c2ad)
- `npm run watch` printed the corresponding `PaymentRecorded` event in real time.

## Next steps

- Call `recordPayment(to, amount, memo)` from a script or Arcscan's "Write Contract" tab to see events flow through `npm run watch`.
- Swap in Circle's [App Kit](https://docs.arc.io/app-kit) (`@circle-fin/app-kit`) to move real testnet USDC instead of just logging amounts.
- See [docs.arc.io](https://docs.arc.io) for App Kit's Bridge/Swap/Send/Unified Balance kits and the Arc MCP server for AI-agent integrations.
