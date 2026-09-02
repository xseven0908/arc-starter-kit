import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { escrow } from "../contracts";

export function EscrowPanel() {
  const { isConnected } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [releaseId, setReleaseId] = useState("0");

  const open = useWriteContract();
  const release = useWriteContract();
  const { isLoading: opening } = useWaitForTransactionReceipt({ hash: open.data });
  const { isLoading: releasing } = useWaitForTransactionReceipt({ hash: release.data });

  function submitOpen(e: React.FormEvent) {
    e.preventDefault();
    open.writeContract({
      address: escrow.address,
      abi: escrow.abi,
      functionName: "open",
      args: [recipient as `0x${string}`],
      value: parseEther(amount),
    });
  }

  function submitRelease(e: React.FormEvent) {
    e.preventDefault();
    release.writeContract({
      address: escrow.address,
      abi: escrow.abi,
      functionName: "release",
      args: [BigInt(releaseId)],
    });
  }

  return (
    <div className="card">
      <h2>Escrow</h2>
      <form onSubmit={submitOpen}>
        <h3>Open</h3>
        <input placeholder="recipient address" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <input placeholder="amount (USDC)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="submit" disabled={!isConnected || open.isPending || opening}>
          {open.isPending || opening ? "confirming..." : "open"}
        </button>
      </form>
      <form onSubmit={submitRelease}>
        <h3>Release (depositor only)</h3>
        <input placeholder="escrow id" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} />
        <button type="submit" disabled={!isConnected || release.isPending || releasing}>
          {release.isPending || releasing ? "confirming..." : "release"}
        </button>
      </form>
    </div>
  );
}
