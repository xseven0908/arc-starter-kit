> [!CAUTION]
> **Disclaimer / 免责声明**
> This project is for personal testing, education, and Arc Testnet experimentation only. It has NOT undergone a formal security audit and is provided "as is," without warranties of any kind. Do not deploy to mainnet or use with real financial assets. The author accepts no liability for any direct or indirect loss.
> 本项目仅供个人测试、教育与 Arc Testnet 实验使用，未经正式安全审计，按“原样”提供，不作任何明示或默示担保。严禁用于主网或真实资金，因使用本项目产生的任何损失作者概不负责。

# Security Model & Design Tradeoffs (v0.2.0)

This document records the threat model, mitigations implemented in v0.2.0, and known limitations for reviewers and community builders in the Arc **Trading & DeFi** and **Architects** programs.

## 1. Mitigations Implemented in v0.2.0

### Push-to-Pull Fallback Against Malicious Receivers (DoS Prevention)
- **Risk in v0.1**: `Invoice.sol`, `Escrow.sol`, and `SavingsPool.sol` previously used Solidity's `.transfer()` (2300 gas stipend). Smart contract wallets (multisigs, AA wallets) or malicious recipient contracts with a reverting `receive()` function could permanently block state transitions or cause out-of-gas reverts.
- **Mitigation in v0.2**:
  - All native USDC transfers use low-level `.call{value: amount}("")` guarded by a `nonReentrant` mutex and strict Checks-Effects-Interactions (CEI) ordering.
  - In `Invoice`, `Escrow`, and `AtomicFxPvP`, if a recipient contract rejects the push transfer during settlement, the state transition still completes and the funds are credited to `pendingWithdrawals[beneficiary]` so the beneficiary can pull them via `withdrawProceeds()` / `claimPending()` / `claimPendingUsdc()`.

### Explicit Input & ID Bounds Validation
- All array-indexed state lookups (`invoices[id]`, `deals[id]`, `quotes[id]`) explicitly check `id < array.length` and revert with descriptive error messages (`invalid invoice id`, `invalid deal id`, `invalid quote id`) rather than panicking with a raw EVM `0x32` array out-of-bounds panic code.

### Internal Asset Accounting in `SavingsPool`
- **Risk in v0.1**: Share minting and redemption relied on `address(this).balance`, which can be manipulated by forced native transfers (`selfdestruct` or block coinbase rewards).
- **Mitigation in v0.2**: `SavingsPool` tracks deposited principal and funded rewards explicitly via `totalAssets`, isolating share price math from unsolicited balance injections.

### AI Agent Guardrails (`agent/`)
- The MCP server enforces two deterministic pre-flight checks before signing any transaction:
  1. Per-call maximum spend cap (`SPEND_CAP_USDC`).
  2. Explicit case-insensitive recipient allowlist (`ALLOWLIST`).
- All agent-originated transactions record an onchain `[agent] ` memo prefix for auditability.

## 2. Known Limitations & Non-Production Scope

1. **Educational Share Vault (`SavingsPool.sol`)**:
   - `SavingsPool` demonstrates ERC-4626 share math over native USDC without wrapping native USDC into an ERC-20 share token.
   - It does not mint virtual dead shares on initialization; in a production vault, virtual shares/assets (per OpenZeppelin ERC-4626) should be added if the pool can ever be emptied and re-seeded by an untrusted first depositor.
2. **No Dispute Arbiter in `Escrow.sol`**:
   - `Escrow.sol` models a pure two-party timeout escrow (`7 days`). If the depositor neither releases nor waits for timeout and a dispute arises over offchain delivery, there is no third-party arbiter role.
3. **Standard ERC-20 Behaviour Assumed in `AtomicFxPvP.sol`**:
   - `AtomicFxPvP` is designed for standard stablecoins like `EURC` and checks the boolean return of `transferFrom`. It does not support fee-on-transfer or rebasing tokens.
4. **Plaintext `.env` Keys for Local Testnet Scripts**:
   - Local scripts read `PRIVATE_KEY` from `.env` (which is gitignored across root, `frontend/`, and `agent/`). Never store mainnet keys in `.env`; production services on Arc should use Circle Developer-Controlled Wallets or hardware KMS signers.
