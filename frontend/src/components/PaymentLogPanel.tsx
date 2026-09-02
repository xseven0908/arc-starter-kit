import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWatchContractEvent, useWriteContract } from "wagmi";
import { paymentLog } from "../contracts";

interface LoggedPayment {
  from: string;
  to: string;
  amount: string;
  memo: string;
  txHash: string;
}

export function PaymentLogPanel() {
  const { isConnected } = useAccount();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [memo, setMemo] = useState("starter-kit demo");
  const [events, setEvents] = useState<LoggedPayment[]>([]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useWatchContractEvent({
    address: paymentLog.address,
    abi: paymentLog.abi,
    eventName: "PaymentRecorded",
    onLogs(logs) {
      setEvents((prev) => [
        ...logs.map((log) => ({
          from: log.args.from ?? "",
          to: log.args.to ?? "",
          amount: log.args.amount?.toString() ?? "0",
          memo: log.args.memo ?? "",
          txHash: log.transactionHash,
        })),
        ...prev,
      ].slice(0, 10));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    writeContract({
      address: paymentLog.address,
      abi: paymentLog.abi,
      functionName: "recordPayment",
      args: [to as `0x${string}`, parseEther(amount), memo],
    });
  }

  return (
    <div className="card">
      <h2>PaymentLog</h2>
      <p>Record a payment memo on-chain (no funds move — see Invoice/Escrow for that).</p>
      <form onSubmit={submit}>
        <input placeholder="to address" value={to} onChange={(e) => setTo(e.target.value)} />
        <input placeholder="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <button type="submit" disabled={!isConnected || isPending || isConfirming}>
          {isPending || isConfirming ? "confirming..." : "recordPayment"}
        </button>
      </form>
      <h3>Live events</h3>
      <ul>
        {events.length === 0 && <li>Waiting for PaymentRecorded events...</li>}
        {events.map((ev, i) => (
          <li key={i}>
            {ev.from.slice(0, 6)}...→{ev.to.slice(0, 6)}... {ev.amount} wei "{ev.memo}" ({ev.txHash.slice(0, 10)}...)
          </li>
        ))}
      </ul>
    </div>
  );
}
