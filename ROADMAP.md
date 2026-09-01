# Roadmap

## Current state (v0.1)

A minimal Hardhat + TypeScript starter targeting Arc Testnet (chain id `5042002`).

| Piece | What it does | Status |
|---|---|---|
| `contracts/PaymentLog.sol` | Records `(from, to, amount, memo)` and emits `PaymentRecorded` | Compiles, one passing test |
| `scripts/deploy.ts` | Deploys `PaymentLog` via Hardhat/ethers | Not yet run against Testnet (needs funded key) |
| `scripts/watch-events.ts` | Live-watches `PaymentRecorded` via viem `watchEvent` | Verified to parse/run; not yet watched a real event |
| `test/PaymentLog.test.ts` | One Hardhat test, local network only | Passing |

What's deliberately **not** there yet: no real token transfer (the contract only logs amounts, it doesn't move USDC), no frontend, no CI, no App Kit integration, no interaction with Arc's Circle-managed SDKs (Developer-Controlled Wallets / Smart Contract Platform).

---

## Phase 1 — Prove the loop end-to-end

Nothing here changes the code; it validates what already exists.

- [ ] Fund a testnet-only wallet from the [Circle faucet](https://faucet.circle.com)
- [ ] `npm run deploy` against Arc Testnet, confirm the contract on [Arcscan](https://testnet.arcscan.app)
- [ ] `npm run watch` in one terminal, call `recordPayment` from Arcscan's "Write Contract" tab in another, confirm the event prints
- [ ] Add the deployed address + a short "it works" note to the README

## Phase 2 — Make payments real (App Kit)

Right now `PaymentLog` just logs numbers; nothing actually moves. Wiring in Circle's `@circle-fin/app-kit` closes that gap:

- [x] `send()` — `scripts/send-payment.ts` moves real testnet USDC via App Kit (verified on Testnet, see README). Still standalone rather than coupled to `recordPayment()`.
- [x] `unifiedBalance` — `scripts/unified-balance.ts` queries `kit.unifiedBalance.getBalances()` (verified working; reads 0 since no funds have been deposited into Gateway yet via `deposit()`)
- [x] `bridge()` — `scripts/bridge-payment.ts` calls `kit.bridge()`; code path verified against the live API (USDC funded on Base Sepolia, but no faucet would issue Base Sepolia ETH for gas without a mainnet balance). Live burn+mint transfer untested; revisit if a gas faucet becomes available.
- [ ] Extend `PaymentLog` (or add a sibling contract) with an `escrow`-style hold/release pattern, since payments + bridging naturally lead to "pay on confirm" flows

## Phase 3 — Contract surface area

The current contract is intentionally the simplest possible thing. Natural next contracts, in rough order of complexity:

- [ ] **Invoice/Subscription**: recurring `recordPayment` calls on a schedule, with a `dueAmount`/`isPaid` view — maps to the "e-commerce settlement" use case in the docs
- [ ] **Escrow**: hold funds until a counterparty confirms — maps to "p2p payments" with dispute safety
- [ ] **Simple lending pool**: deposit/borrow against USDC collateral — maps to the "lending protocols" use case; good vehicle for learning Arc's fee model since it's on `docs.arc.io/arc/references/gas-and-fees`
- [ ] Multi-contract test suite + gas snapshot once there's more than one contract, so regressions in fee behavior are visible

## Phase 4 — Frontend

- [ ] A small Next.js/Vite app using `wagmi` + `viem`, per Arc's recommended wallet stack
- [ ] Wallet connect via ConnectKit or Reown AppKit (both explicitly supported per `arc/references/connect-to-arc`)
- [ ] UI for: connect wallet → see unified balance → send a logged payment → watch it appear from `watch-events.ts` (or a websocket variant) in real time
- [ ] Deploy the frontend somewhere static (Vercel/Netlify) so it's a shareable demo, not just local scripts

## Phase 5 — AI agent integration

- [ ] Point an MCP-capable client at Arc's MCP server (`docs.arc.io/ai/mcp` — needs a fresh read, it 404'd during initial research) to let an LLM query balances/contract state directly
- [ ] Build a small agent that autonomously calls `recordPayment`/`send()` under a spending policy (fixed cap per call, allowlisted recipients) — matches the "AI agent economy" use case from the docs
- [ ] Log agent-initiated payments distinctly (e.g. a `memo` prefix or a separate event) so agent activity is auditable against human-initiated payments

## Phase 6 — Operational hardening

- [ ] GitHub Actions CI: `npm ci && npm run compile && npm test` on every push/PR
- [ ] Solidity static analysis (Slither or equivalent) once contracts beyond `PaymentLog` exist
- [ ] Move `PRIVATE_KEY` handling off plaintext `.env` for anything beyond local testnet use (e.g. Circle's Developer-Controlled Wallets, which sign server-side and never expose a raw key — see `arc/tutorials/deploy-contracts`)
- [ ] Read `arc/references/evm-differences` before writing anything beyond simple contracts — Arc's Reth-based EVM has a few documented deviations (e.g. around `CALL`-related precompiles) worth knowing before they cause a subtle bug

---

## Suggested order

Phase 1 first regardless — an unverified deploy script is a liability. After that, Phase 2 (real USDC movement via App Kit) is the highest-value next step since it's what actually differentiates Arc from "yet another EVM chain," followed by Phase 4 (frontend) to make the project demoable. Phases 3, 5, and 6 can interleave depending on whether you're more interested in contract design, AI-agent workflows, or making this production-shaped.
