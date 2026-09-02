# Arc Starter Kit — Frontend

> **Disclaimer / 免责声明:** Personal testing only, no warranties, use at your own risk — the author is not
> liable for any loss. 仅供个人测试使用,不作任何承诺,风险自负,由此造成的任何损失作者概不负责。

Vite + React + TypeScript dApp for the [PaymentLog, Invoice, Escrow, and SavingsPool contracts](../README.md)
deployed on Arc Testnet. Uses [wagmi](https://wagmi.sh) + [viem](https://viem.sh) for chain interaction and
[ConnectKit](https://docs.family.co/connectkit) for wallet connection (any browser-injected wallet — MetaMask,
Rabby, Coinbase Wallet, etc. — configured for Arc Testnet per the root README's network details).

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173, connect a wallet configured for Arc Testnet (chain id `5042002`,
RPC `https://rpc.testnet.arc.io`), and fund it from the [Circle faucet](https://faucet.circle.com).

Contract addresses in `src/contracts.ts` point at the instances already deployed and verified on Testnet
(see the root README's "Verified deployment" section). Edit that file if you redeploy your own.

## What's here

- `src/chain.ts` — Arc Testnet chain definition for viem/wagmi.
- `src/config.ts` — wagmi config via ConnectKit's `getDefaultConfig`.
- `src/contracts.ts` — deployed addresses + minimal ABIs for all four contracts.
- `src/components/` — one panel per contract (`Balance`, `PaymentLogPanel`, `InvoicePanel`, `EscrowPanel`,
  `SavingsPoolPanel`), each a form wired to `useWriteContract`/`useReadContract`/`useWatchContractEvent`.

## Verified

- `npm run build` and `tsc -b` both succeed with no errors.
- The dev server serves the app and every source module transpiles cleanly through Vite (checked via direct
  requests to each module's dev endpoint).
- **Not yet verified**: interactive browser testing (connecting a real wallet and exercising the golden path)
  wasn't possible in the session this was built in — Chrome browser tools were unavailable. Static checks
  (type-check, build, module transpilation) all pass, but click-through testing with a live wallet is still
  outstanding.
