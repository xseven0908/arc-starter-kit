# Roadmap

## Phase 1 — Prove the loop end-to-end (Complete)

- [x] Fund a testnet-only wallet from the [Circle faucet](https://faucet.circle.com)
- [x] `npm run deploy` against Arc Testnet, confirm the contract on [Arcscan](https://testnet.arcscan.app)
- [x] `npm run watch` live event verification against real transactions
- [x] Document deployed addresses and verified transactions in `README.md` and `deployments/arc-testnet.json`

## Phase 2 — Make payments real (App Kit) (Complete)

- [x] `send()` — `scripts/send-payment.ts` moves real testnet USDC via App Kit (verified on Testnet)
- [x] `unifiedBalance` — `scripts/unified-balance.ts` queries `kit.unifiedBalance.getBalances()`
- [x] `bridge()` — `scripts/bridge-payment.ts` calls `kit.bridge()` (code-verified against live RPC)
- [x] Extend contract surface with hold/release (`Escrow.sol`) and atomic FX settlement (`AtomicFxPvP.sol`)

## Phase 3 — Contract surface area & v0.2 security hardening (Complete)

- [x] **Invoice**: `contracts/Invoice.sol` — sellers issue invoices, buyers pay in native USDC via `payable`; hardened with `nonReentrant`, ID bounds checks, and pull-payment fallback (`withdrawProceeds()`).
- [x] **Escrow**: `contracts/Escrow.sol` — open/release/refund/reclaim-after-timeout; hardened with `nonReentrant`, ID bounds checks, and pull-payment fallback (`claimPending()`).
- [x] **Savings pool**: `contracts/SavingsPool.sol` — single-asset native USDC vault with internal `totalAssets` accounting and `nonReentrant` protection.
- [x] **Atomic FX PvP**: `contracts/AtomicFxPvP.sol` — RFQ Payment-versus-Payment settlement between native 18-decimal USDC and 6-decimal ERC-20 stablecoins (e.g. `EURC`).
- [x] **27-test suite**: malicious reverting-receiver DoS resistance, multi-user share conservation, and FX PvP atomicity tests.

## Phase 4 — Frontend

- [x] `frontend/` — Vite + React + TypeScript app using `wagmi` + `viem` + `ConnectKit`
- [x] UI for PaymentLog, Invoice, Escrow, and SavingsPool
- [x] Automated frontend production build verification in GitHub Actions CI

## Phase 5 — AI agent integration (Complete)

- [x] Local MCP server (`agent/`) exposing `get_balance`, `send_payment`, and `list_recent_payments` under `SPEND_CAP_USDC` and `ALLOWLIST` guardrails
- [x] `[agent] ` memo tagging and RPC log-pruning graceful degradation

## Phase 6 — Operational hardening (Complete)

- [x] Full-stack GitHub Actions CI (`.github/workflows/ci.yml`): verifies root contracts/tests, `frontend/` build, and `agent/` TypeScript check on every push/PR
- [x] Architecture (`docs/architecture.md`) and Security Model (`docs/security-model.md`) documentation with explicit disclaimers
- [x] MIT `LICENSE` and structured `deployments/arc-testnet.json` manifest
