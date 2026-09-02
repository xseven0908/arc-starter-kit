# Arc Starter Kit — Agent

> **Disclaimer / 免责声明:** Personal testing only, no warranties, use at your own risk — the author is not
> liable for any loss. 仅供个人测试使用,不作任何承诺,风险自负,由此造成的任何损失作者概不负责。

A local [MCP](https://modelcontextprotocol.io) server that lets an AI agent make guarded USDC payments on
Arc Testnet, modeling the "AI agent economy" use case from the Arc docs.

**Note:** Arc's own MCP server at `docs.arc.io/mcp` is a documentation-search tool (`search` / `get page`
over Arc's docs) — it has no wallet, balance, or contract-state tools. There's nothing there for an agent to
transact with, so this directory builds a purpose-made one instead.

## Tools

- **`get_balance(address?)`** — native USDC balance of an address (defaults to the agent's own wallet).
- **`send_payment(to, amount, memo)`** — sends native USDC to `to` and logs it on `PaymentLog` with a
  `[agent]`-prefixed memo. Rejected if `amount` exceeds `SPEND_CAP_USDC`, or if `to` isn't in `ALLOWLIST` —
  these are the spending-policy guardrails an autonomous agent needs before it's trusted with a live wallet.
- **`list_recent_payments(limit?)`** — recent `PaymentRecorded` events, each flagged `isAgentPayment` based
  on the memo prefix, so agent activity is auditable against human-initiated payments. Scoped to roughly the
  last 200 blocks — see "Known limitation" below.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`: `PRIVATE_KEY` (a funded testnet wallet), `SPEND_CAP_USDC` (max per `send_payment` call), and
`ALLOWLIST` (comma-separated addresses `send_payment` is allowed to pay — empty means everything is rejected).

```bash
npm start        # runs the MCP server over stdio
npm test         # runs src/test-client.ts: a full round-trip against the live server (real Testnet txs)
```

To use it from an MCP client (Claude Desktop, Claude Code, Cursor, etc.), point it at
`npx tsx <path-to-this-dir>/src/server.ts` with the working directory set to this folder (so it picks up `.env`).

## Verified

`npm test` was run live against Arc Testnet:

- `get_balance` returned the real wallet balance.
- `send_payment` correctly **rejected** an over-cap amount (5.0 USDC against a 1.0 cap) and a valid amount
  to a non-allowlisted address.
- `send_payment` correctly **succeeded** for 0.02 USDC to an allowlisted address — sent a real native
  transfer and recorded it on `PaymentLog` with memo `[agent] agent test payment`.
- `list_recent_payments`, queried directly afterward, found both agent-made transactions with
  `isAgentPayment: true`.

## Known limitation

Arc Testnet's public RPC prunes `eth_getLogs` history — querying from block 0 fails outright
(`pruned history unavailable`), and even querying a few hundred blocks back is inconsistent, most likely
because the RPC hostname load-balances across multiple backend nodes with different retention (also hit an
occasional `rate limit exceeded`, unrelated to pruning). `list_recent_payments` copes by querying only the
last ~200 blocks and returning `{ payments: [], warning: "..." }` instead of failing the whole tool call when
the RPC errors — verified working in both the pruning-error and rate-limit-error cases during testing, and
confirmed returning real results once the RPC settled down.
