import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io",
      chainId: 5042002,
      accounts: [process.env.PRIVATE_KEY, process.env.BIDDER_PRIVATE_KEY].filter(
        (k): k is string => Boolean(k)
      ),
    },
  },
};

export default config;
