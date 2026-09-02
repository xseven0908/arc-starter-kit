import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { invoice } from "../contracts";

export function InvoicePanel() {
  const { isConnected } = useAccount();
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("0.05");
  const [memo, setMemo] = useState("order #1");
  const [payId, setPayId] = useState("0");
  const [payAmount, setPayAmount] = useState("0.05");

  const create = useWriteContract();
  const pay = useWriteContract();
  const { isLoading: creating } = useWaitForTransactionReceipt({ hash: create.data });
  const { isLoading: paying } = useWaitForTransactionReceipt({ hash: pay.data });

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    create.writeContract({
      address: invoice.address,
      abi: invoice.abi,
      functionName: "createInvoice",
      args: [(payer || "0x0000000000000000000000000000000000000000") as `0x${string}`, parseEther(amount), memo],
    });
  }

  function submitPay(e: React.FormEvent) {
    e.preventDefault();
    pay.writeContract({
      address: invoice.address,
      abi: invoice.abi,
      functionName: "payInvoice",
      args: [BigInt(payId)],
      value: parseEther(payAmount),
    });
  }

  return (
    <div className="card">
      <h2>Invoice</h2>
      <form onSubmit={submitCreate}>
        <h3>Create</h3>
        <input placeholder="payer (blank = anyone)" value={payer} onChange={(e) => setPayer(e.target.value)} />
        <input placeholder="amount (USDC)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <button type="submit" disabled={!isConnected || create.isPending || creating}>
          {create.isPending || creating ? "confirming..." : "createInvoice"}
        </button>
      </form>
      <form onSubmit={submitPay}>
        <h3>Pay</h3>
        <input placeholder="invoice id" value={payId} onChange={(e) => setPayId(e.target.value)} />
        <input placeholder="amount (must match exactly)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        <button type="submit" disabled={!isConnected || pay.isPending || paying}>
          {pay.isPending || paying ? "confirming..." : "payInvoice"}
        </button>
      </form>
    </div>
  );
}
