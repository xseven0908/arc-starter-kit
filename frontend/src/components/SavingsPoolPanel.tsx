import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { savingsPool } from "../contracts";

export function SavingsPoolPanel() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState("0.1");
  const [withdrawShares, setWithdrawShares] = useState("0");

  const { data: redeemable, refetch } = useReadContract({
    address: savingsPool.address,
    abi: savingsPool.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const deposit = useWriteContract();
  const withdraw = useWriteContract();
  const { isLoading: depositing, isSuccess: deposited } = useWaitForTransactionReceipt({ hash: deposit.data });
  const { isLoading: withdrawing, isSuccess: withdrawn } = useWaitForTransactionReceipt({ hash: withdraw.data });

  if (deposited || withdrawn) refetch();

  function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    deposit.writeContract({
      address: savingsPool.address,
      abi: savingsPool.abi,
      functionName: "deposit",
      value: parseEther(depositAmount),
    });
  }

  function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    withdraw.writeContract({
      address: savingsPool.address,
      abi: savingsPool.abi,
      functionName: "withdraw",
      args: [BigInt(withdrawShares)],
    });
  }

  return (
    <div className="card">
      <h2>SavingsPool</h2>
      <p>Redeemable balance: {redeemable !== undefined ? `${formatEther(redeemable)} USDC` : "-"}</p>
      <form onSubmit={submitDeposit}>
        <h3>Deposit</h3>
        <input placeholder="amount (USDC)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
        <button type="submit" disabled={!isConnected || deposit.isPending || depositing}>
          {deposit.isPending || depositing ? "confirming..." : "deposit"}
        </button>
      </form>
      <form onSubmit={submitWithdraw}>
        <h3>Withdraw</h3>
        <input placeholder="shares (wei)" value={withdrawShares} onChange={(e) => setWithdrawShares(e.target.value)} />
        <button type="submit" disabled={!isConnected || withdraw.isPending || withdrawing}>
          {withdraw.isPending || withdrawing ? "confirming..." : "withdraw"}
        </button>
      </form>
    </div>
  );
}
