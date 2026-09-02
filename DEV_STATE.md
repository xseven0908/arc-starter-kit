# Dev State

## Goal

Build a hands-on starter kit for Arc Testnet (Circle's stablecoin-native, EVM-compatible L1 where USDC is the native gas token, chain id `5042002`), demonstrating real on-chain payment patterns rather than a toy demo, and keep pushing to GitHub (`https://github.com/xseven0908/arc-starter-kit`) as small, individually-verified commits.

## Current state

18 commits on `main`, working tree clean. Root project: all 17 Hardhat tests passing, `tsc --noEmit` clean, GitHub Actions CI green. `agent/` and `frontend/` are separate npm packages within the same repo, each verified independently (details below). All six phases from `ROADMAP.md` have at least an initial pass built and pushed; two items are explicitly left unverified rather than falsely claimed done (see Known issues).

**Contracts** (`contracts/`), each written, tested locally, deployed to Arc Testnet, and exercised with a real transaction:

- **PaymentLog** — records `(from, to, amount, memo)`, emits `PaymentRecorded`. `0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5`.
- **Invoice** — seller issues an invoice, buyer pays via `payable`/`msg.value` (no ERC-20 approve needed, USDC is Arc's native asset). `0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed`.
- **Escrow** — depositor locks USDC for a recipient; release on confirmation, self-refund, or reclaim after a 7-day timeout. `0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D`.
- **SavingsPool** — single-asset ERC-4626-style share vault (deposit mints shares, `fundRewards()` raises share value, withdraw redeems principal + yield). `0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069`. Built after the user explicitly chose this over a mock-ERC20 collateral lending pool, since Arc's native asset is USDC itself (no second token to borrow against without adding one).

All four addresses, plus example transaction links for each, are in the root `README.md`'s "Verified deployment" section — don't re-deploy, reuse these.

**App Kit** (`@circle-fin/app-kit`, root `scripts/`), signing locally via `createViemAdapterFromPrivateKey` (no browser wallet, no Circle-hosted wallet, no Circle API key needed):

- `send-payment.ts` (`kit.send()`) — verified live.
- `unified-balance.ts` (`kit.unifiedBalance.getBalances()`) — verified live; correctly reads 0 because Gateway tracks funds deposited via `deposit()`, which hasn't been called (expected, not a bug).
- `bridge-payment.ts` (`kit.bridge()`) — code path verified against the live API (correct `BALANCE_INSUFFICIENT_TOKEN` rejection). **No live end-to-end run** — see Known issues.

**Frontend** (`frontend/`) — Vite + React + TypeScript + wagmi + viem + ConnectKit. One panel per contract (`PaymentLogPanel`, `InvoicePanel`, `EscrowPanel`, `SavingsPoolPanel`) plus a `Balance` display, wired to the deployed addresses above. `tsc -b` and `npm run build` both pass; every source module transpiles cleanly through Vite's dev server. **No interactive browser test** — see Known issues.

**Agent** (`agent/`) — a local MCP server (`@modelcontextprotocol/sdk`, stdio transport) exposing `get_balance`, `send_payment` (native transfer + `PaymentLog` record, gated by a `SPEND_CAP_USDC` cap and an `ALLOWLIST` of recipients), and `list_recent_payments` (flags agent-made payments via a `[agent]` memo prefix). This exists because Arc's own MCP server (`docs.arc.io/mcp` — note the correct path has no `/ai/` segment) turned out to be documentation-search only (`search`/`get page`), not a wallet interface — there was nothing there for an agent to transact with. Verified live end-to-end via `agent/src/test-client.ts` (a real MCP client over stdio, run with `npm test` inside `agent/`): over-cap rejected, non-allowlisted-recipient rejected, a valid 0.02 USDC payment succeeded (real transfer + logged event), and `list_recent_payments` found both agent payments correctly flagged.

**Engineering**: `.github/workflows/ci.yml` runs `npm ci`, `compile`, `tsc --noEmit`, `test` on push/PR to `main`; CI badge in root README. Bilingual (EN/CN) "personal testing only, no warranty, no liability" disclaimer at the top of the root README and at the top of the frontend UI, per explicit user request.

## Key decisions

- **Hardhat over Foundry**: avoids installing a global binary; pure npm dependency tree.
- **`gh` CLI for GitHub sync**: installed via Homebrew, device-code auth. Needed a second `gh auth refresh -s workflow` pass specifically to unlock pushing `.github/workflows/*` — the initial token lacked the `workflow` OAuth scope.
- **One throwaway test wallet reused everywhere** (root project and agent): `0x4dEF2eFF8534805379D3f554311336F258EEC8bc`. Private key only ever in local `.env` files (gitignored in every package: root, `frontend/`, `agent/`). Funded with USDC on Arc Testnet and on Base Sepolia via `faucet.circle.com`.
- **`tsconfig.json` must include `"typechain-types"`**: without it, `ethers.getContractFactory("X")` resolves to bare `BaseContract` (no named methods) under standalone `tsc --noEmit`, even though `hardhat test` itself still passes. Fixed once in the root `tsconfig.json`; applies to all contracts automatically.
- **SavingsPool over a lending pool**: explicit user choice when asked — Arc's native asset being USDC itself makes a classic collateralized borrow/lend pool need a second token, which felt like scope the user hadn't asked for.
- **React 18, not 19, in `frontend/`**: `connectkit`'s peer dependency only supports React 17/18; Vite's default scaffold installs 19. Pinned down rather than forcing an unsupported peer resolution.
- **`agent/` builds its own MCP server rather than connecting to Arc's**: see Current state above — Arc's hosted MCP server has no transact-capable tools, only docs search.
- **Deferring to the user instead of guessing on ambiguous scope**: happened twice — the bridge-gas faucet dead end (user chose to skip live testing rather than try more faucets) and the lending-pool design (user chose the single-asset savings pool option). Both documented here rather than silently picking an option.

## Known issues / open items

- **`bridge-payment.ts` has no live end-to-end run.** The wallet holds USDC on Base Sepolia but no Base Sepolia ETH for gas — every faucet tried gates behind a mainnet ETH balance requirement, which the user declined to satisfy by spending real money. Code path is verified up to the on-chain balance check, not beyond it.
- **Frontend has no interactive browser test.** Chrome browser tools were unavailable in the session it was built in (`/chrome` needed to enable them, or a restart). Static checks (type-check, production build, per-module dev-server transpilation) all pass; connecting a real wallet and clicking through the golden path has not been done.
- **Arc Testnet's public RPC prunes/rate-limits `eth_getLogs`.** Querying from block 0 fails outright (`pruned history unavailable`); a few hundred blocks back is inconsistent (likely a load-balanced pool of backend nodes with different retention), and a `rate limit exceeded` was also observed. `agent/`'s `list_recent_payments` copes by scoping to a ~200-block lookback and returning `{ payments: [], warning }` instead of failing the tool call on RPC error — confirmed hitting both error types during testing, and confirmed returning real results once the RPC settled down. Worth remembering if any future script needs historical event data: don't query wide ranges against the default RPC.
- Node.js v25.4.0 (the local environment's version) triggers a Hardhat compatibility warning on every command; harmless so far. CI intentionally pins Node 20.
- Incremental `npm install <pkg>` calls (adding one package at a time across commits) let `package-lock.json` drift out of sync with the real dependency tree once (657 vs. 740 packages once regenerated), which broke `npm ci` in CI. Fixed by a clean `rm -rf node_modules package-lock.json && npm install`. Do a clean reinstall rather than trusting incremental installs if this recurs in any of the three packages (root, `frontend/`, `agent/`).

## Failed approaches

- Backgrounding `npm run watch` via `... &` inside a single shell invocation that also had `sleep`/`cat` in the foreground — the background job died when the wrapping shell exited before the test transaction was sent. Fixed by launching it as its own standalone background command.
- Base Sepolia gas faucets (Alchemy, QuickNode) for the bridge test — both require a pre-existing mainnet ETH balance. Abandoned per user's choice.

## Next steps

Nothing is blocking; these are optional follow-ups, roughly in order of value:

1. Interactive browser test of `frontend/` with a real wallet, once Chrome browser tools are available (`/chrome`) — the one meaningful gap in an otherwise fully-verified project.
2. Revisit a live `bridge()` test if a no-cost Base Sepolia gas source turns up.
3. Consider deploying `frontend/` somewhere static (Vercel/Netlify) so it's a shareable link, not just `npm run dev` — listed in `ROADMAP.md` Phase 4 and still unchecked.
4. `ROADMAP.md` at the repo root has the full phase-by-phase plan and per-item status detail — treat it as the source of truth for scope; this file is about *state*, not the plan.
