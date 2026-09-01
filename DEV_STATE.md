# Dev State

## Goal

Build a hands-on starter kit for Arc Testnet (Circle's stablecoin-native, EVM-compatible L1 where USDC is the native gas token, chain id `5042002`), demonstrating real on-chain payment patterns rather than a toy demo, and keep pushing to GitHub (`https://github.com/xseven0908/arc-starter-kit`) as small, individually-verified commits.

## Current state

11 commits on `main`, working tree clean, all 12 Hardhat tests passing, `tsc --noEmit` clean, GitHub Actions CI green.

Three contracts, each written, tested locally, deployed to Arc Testnet, and exercised with a real transaction:

- **PaymentLog** (`contracts/PaymentLog.sol`) — records `(from, to, amount, memo)` and emits `PaymentRecorded`. Deployed at `0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`; a real transaction was sent and `scripts/watch-events.ts` (viem `watchEvent`) confirmed catching the event live.
- **Invoice** (`contracts/Invoice.sol`) — seller issues an invoice, buyer pays it via `payable`/`msg.value` (no ERC-20 approve step needed, since USDC is Arc's native asset). Deployed at `0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed`; created and paid a 0.05 USDC invoice live (seller and payer were the same test wallet for simplicity).
- **Escrow** (`contracts/Escrow.sol`) — depositor locks native USDC for a recipient; depositor releases on confirmation, recipient can self-refund, or depositor reclaims after a 7-day timeout. Deployed at `0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D`; opened and released 0.2 USDC to a separate recipient address live.

App Kit (`@circle-fin/app-kit`) integration, using `createViemAdapterFromPrivateKey` from `@circle-fin/adapter-viem-v2/next` so scripts sign locally with the same test private key (no browser wallet, no Circle-hosted wallet, no Circle API key):

- `scripts/send-payment.ts` (`kit.send()`) — verified live: moved 0.10 USDC between two addresses on Arc Testnet.
- `scripts/unified-balance.ts` (`kit.unifiedBalance.getBalances()`) — verified live against the real Gateway API; correctly returns 0 across all chains because Gateway tracks funds explicitly deposited via `kit.unifiedBalance.deposit()`, which hasn't been called — this is expected behavior, not a bug.
- `scripts/bridge-payment.ts` (`kit.bridge()`) — code path verified against the live API (correctly throws `BALANCE_INSUFFICIENT_TOKEN` when under-funded). **Not fully live-tested**: the test wallet holds 20 USDC on Base Sepolia (funded via the Circle faucet) but no Base Sepolia ETH for gas — every gas faucet tried gates behind a mainnet ETH balance requirement, which the user does not want to satisfy by spending real money. This is the one script in the kit without an end-to-end live run.

Engineering: `.github/workflows/ci.yml` runs `npm ci`, `compile`, `tsc --noEmit`, `test` on push/PR to `main`; CI badge in README.

## Key decisions

- **Hardhat over Foundry**: avoids installing a global binary; pure npm dependency tree.
- **`gh` CLI for GitHub sync**: installed via Homebrew, authenticated via device-code flow (browser). Needed a second `gh auth refresh -s workflow` pass specifically to get permission to push `.github/workflows/*` — the initial token lacked the `workflow` OAuth scope.
- **One throwaway test wallet reused everywhere**: `0x4dEF2eFF8534805379D3f554311336F258EEC8bc`, private key only in local `.env` (gitignored, never committed). Funded with 20 USDC on Arc Testnet and 20 USDC on Base Sepolia via `faucet.circle.com`.
- **`tsconfig.json` must include `"typechain-types"`**: without it, `ethers.getContractFactory("X")` resolves to bare `BaseContract` (no named methods) under standalone `tsc --noEmit`, even though `hardhat test` itself still passes (it doesn't run the same strict standalone type-check). Fixed once; applies to all future contracts automatically.
- **Bridge/lending pool decisions deferred to the user rather than guessed**: when Base Sepolia gas couldn't be obtained without spending real ETH, the user was asked and chose to skip live bridge testing rather than try more faucets. The lending-pool roadmap item was intentionally left unbuilt (see Known issues / open decision below) instead of shipping a design that might not match what the user wants.

## Known issues / open decisions

- **Lending pool not built.** Arc's native asset *is* USDC, so a classic over-collateralized borrow/lend pool needs a second token to serve as collateral — building one blind would guess at scope the user hasn't confirmed. Two options are on the table and unresolved: (a) scope it down to a single-asset fixed-rate savings pool (deposit/withdraw, no borrowing), or (b) deploy a mock ERC-20 as a second asset so real collateralized borrowing can be demonstrated. Needs a decision before writing code.
- **`bridge-payment.ts` has no live end-to-end run** (see above) — code is verified up to the on-chain balance check, not beyond it.
- Node.js v25.4.0 (the local environment's version) triggers a Hardhat compatibility warning on every command; harmless so far, but CI intentionally pins Node 20 to avoid relying on an unsupported local version.
- `npm install`'s incremental installs (adding one package at a time across several commits) let `package-lock.json` drift out of sync with the real dependency tree (657 vs. 740 packages once regenerated), which broke `npm ci` in CI. Fixed by deleting `node_modules` + the lock file and reinstalling clean. Worth doing a clean reinstall rather than incremental `npm install <pkg>` calls if this recurs.

## Failed approaches

- Tried to run the event watcher (`npm run watch`) backgrounded via `... &` inside a single shell invocation that also had a `sleep`/`cat` in the foreground — the background job died when the wrapping shell exited before the test transaction was sent, so the watcher never saw the event. Fixed by launching `npm run watch` as its own standalone background command instead of nesting `&` inside another backgrounded shell.
- Tried Base Sepolia gas faucets (Alchemy, QuickNode) to fund the bridge test — both require the requesting wallet to already hold a minimum mainnet ETH balance, which the user declined to satisfy. Abandoned in favor of documenting the bridge script as code-verified-only.

## Next steps

1. Decide the lending-pool design (single-asset savings pool vs. mock-ERC20 collateral pool) before building it — this is a user decision, not something to guess.
2. Optionally revisit a live `bridge()` test if a no-cost Base Sepolia gas source turns up later.
3. Phase 4 (frontend: Next.js/Vite + wagmi/viem + ConnectKit or Reown AppKit) and Phase 5 (AI-agent integration via Arc's MCP server — note: `docs.arc.io/ai/mcp` returned 404 when first checked, needs re-finding) are both queued but not started; user was last asked whether to continue into either and has not yet answered.
4. Full phase-by-phase plan lives in `ROADMAP.md` at the repo root — treat it as the source of truth for scope, this file is about *state*, not the plan itself.
