import { useAccount, useBalance } from "wagmi";

export function Balance() {
  const { address, isConnected } = useAccount();
  const { data, isLoading } = useBalance({ address });

  if (!isConnected) return null;

  return (
    <div className="card">
      <h2>Wallet</h2>
      <p>
        <code>{address}</code>
      </p>
      <p>
        Native USDC balance: {isLoading ? "loading..." : `${data?.formatted ?? "0"} ${data?.symbol ?? "USDC"}`}
      </p>
    </div>
  );
}
