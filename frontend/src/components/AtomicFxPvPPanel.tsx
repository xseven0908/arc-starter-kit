import { useState } from "react";
import { parseEther, parseUnits } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { arcTestnet } from "../chain";
import { atomicFxPvP } from "../contracts";

export function AtomicFxPvPPanel() {
  const { address, isConnected } = useAccount();
  const [taker, setTaker] = useState("");
  const [sellUsdc, setSellUsdc] = useState("10.85");
  const [buyEurc, setBuyEurc] = useState("10.00");
  const [quoteId, setQuoteId] = useState("0");

  const create = useWriteContract();
  const fill = useWriteContract();
  const { isLoading: creating } = useWaitForTransactionReceipt({ hash: create.data });
  const { isLoading: filling } = useWaitForTransactionReceipt({ hash: fill.data });

  function submitCreateQuote(e: React.FormEvent) {
    e.preventDefault();
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
    create.writeContract({
      address: atomicFxPvP.address,
      abi: atomicFxPvP.abi,
      functionName: "createQuote",
      args: [
        (taker || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        atomicFxPvP.eurcAddress,
        parseUnits(buyEurc, 6),
        expiry,
      ],
      value: parseEther(sellUsdc),
      chain: arcTestnet,
      account: address,
    });
  }

  function submitFillQuote(e: React.FormEvent) {
    e.preventDefault();
    fill.writeContract({
      address: atomicFxPvP.address,
      abi: atomicFxPvP.abi,
      functionName: "fillQuote",
      args: [BigInt(quoteId)],
      chain: arcTestnet,
      account: address,
    });
  }

  return (
    <div className="card">
      <h2>AtomicFxPvP (USDC ↔ EURC)</h2>
      <p>Atomic RFQ Payment-vs-Payment settlement between 18-dec native USDC and 6-dec EURC.</p>
      <form onSubmit={submitCreateQuote}>
        <h3>Create RFQ Quote (Maker locks USDC)</h3>
        <input placeholder="designated taker (blank = open RFQ)" value={taker} onChange={(e) => setTaker(e.target.value)} />
        <input placeholder="sell amount (native USDC)" value={sellUsdc} onChange={(e) => setSellUsdc(e.target.value)} />
        <input placeholder="buy amount (EURC, 6-dec)" value={buyEurc} onChange={(e) => setBuyEurc(e.target.value)} />
        <button type="submit" disabled={!isConnected || create.isPending || creating}>
          {create.isPending || creating ? "confirming..." : "createQuote (1h expiry)"}
        </button>
      </form>
      <form onSubmit={submitFillQuote}>
        <h3>Fill Quote (Taker settles EURC leg)</h3>
        <input placeholder="quote id" value={quoteId} onChange={(e) => setQuoteId(e.target.value)} />
        <button type="submit" disabled={!isConnected || fill.isPending || filling}>
          {fill.isPending || filling ? "confirming..." : "fillQuote"}
        </button>
      </form>
    </div>
  );
}
