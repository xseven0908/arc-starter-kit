> [!CAUTION]
> **Disclaimer / 免责声明**
> This document and repository are provided solely for education, research, and Arc Testnet experimentation. Unaudited, not production-ready, and must not be used with real assets or relied upon for financial, business, or operational decisions. Provided "as is" without warranties of any kind.
> 本文档及代码库仅供教育、研究和 Arc Testnet 实验使用，未经安全审计，不适用于生产环境或真实资产，按“原样”提供，风险自负。

# Architecture & Payment Primitives

`arc-starter-kit` (v0.2.0) is a full-stack reference laboratory for **Arc Testnet** (chain ID `5042002`), demonstrating how native USDC gas (`18` decimals) and ecosystem stablecoins (`EURC`, `6` decimals) simplify payment, escrow, yield-vault, FX PvP, and AI-agent settlement patterns.

```mermaid
flowchart TB
    subgraph Contracts["Solidity Contracts (contracts/)"]
        PL[PaymentLog.sol<br/>Onchain Memo Ledger]
        INV[Invoice.sol<br/>Payable E-Commerce Settlement]
        ESC[Escrow.sol<br/>7-Day Timeout & Confirm Release]
        SP[SavingsPool.sol<br/>ERC-4626-Style Native USDC Share Vault]
        FX[AtomicFxPvP.sol<br/>Native USDC ↔ ERC-20 EURC RFQ PvP]
    end

    subgraph AppKit["Circle App Kit Scripts (scripts/)"]
        SEND[send-payment.ts]
        BAL[unified-balance.ts]
        BRG[bridge-payment.ts]
    end

    subgraph Agent["Guarded MCP Server (agent/)"]
        MCP[server.ts<br/>SPEND_CAP_USDC + ALLOWLIST]
    end

    subgraph Frontend["React + wagmi dApp (frontend/)"]
        UI[ConnectKit + Contract Panels]
    end

    MCP -->|Native Transfer + "[agent]" Memo| PL
    UI --> PL & INV & ESC & SP
    SEND & BAL & BRG -->|Circle App Kit| ArcRPC[(Arc Testnet RPC)]
    Contracts --> ArcRPC
```

## Five Core Onchain Primitives

1. **`PaymentLog.sol`**: Minimal append-only payment event ledger (`PaymentRecorded`) used by both human callers and the `agent/` MCP server (which prefixes memos with `[agent] `).
2. **`Invoice.sol`**: Single-transaction invoice settlement in native USDC (`msg.value`) — no prior ERC-20 `approve()` step needed. Includes pull-payment fallback (`pendingWithdrawals` / `withdrawProceeds()`) if a contract seller rejects direct native push transfers.
3. **`Escrow.sol`**: Peer-to-peer payment protection with three exit paths: depositor `release()`, voluntary recipient `refund()`, or depositor `reclaim()` after `RECLAIM_TIMEOUT` (`7 days`). Includes pull-payment fallback (`claimPending()`).
4. **`SavingsPool.sol`**: Single-asset native USDC yield vault using ERC-4626-style proportional share accounting (`totalShares` and internal `totalAssets`), illustrating how reward top-ups (`fundRewards()`) appreciate share value without requiring a second collateral token.
5. **`AtomicFxPvP.sol`**: Request-for-Quote (RFQ) Payment-versus-Payment (PvP) settlement between native 18-decimal USDC and 6-decimal ERC-20 tokens (such as Arc Testnet `EURC`). Eliminates Herstatt/settlement risk by settling both legs atomically in `fillQuote()`.
