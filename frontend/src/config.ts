import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { arcTestnet } from "./chain";

export const config = createConfig(
  getDefaultConfig({
    chains: [arcTestnet],
    transports: {
      [arcTestnet.id]: http(),
    },
    // Optional: set VITE_WALLETCONNECT_PROJECT_ID to enable WalletConnect-based
    // wallets. Without it, browser-injected wallets (MetaMask, Rabby, etc.) still work.
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    appName: "Arc Starter Kit",
  })
);
