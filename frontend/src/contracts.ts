import { parseAbi } from "viem";

// Addresses of the contracts deployed on Arc Testnet
// (see the root README.md "Verified deployment" section and deployments/arc-testnet.json).
// Redeploy with `npm run deploy*` from the repo root and update these if you want fresh ones.

export const paymentLog = {
  address: "0xB273B3D1f6fD43cc7EfaC625bfF56f114895adB5" as const,
  abi: parseAbi([
    "function recordPayment(address to, uint256 amount, string memo) external",
    "function paymentsCount() view returns (uint256)",
    "event PaymentRecorded(address indexed from, address indexed to, uint256 amount, string memo)",
  ]),
};

export const invoice = {
  address: "0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed" as const,
  abi: parseAbi([
    "function createInvoice(address payer, uint256 amount, string memo) external returns (uint256)",
    "function payInvoice(uint256 id) external payable",
    "function withdrawProceeds() external",
    "function invoices(uint256) view returns (address seller, address payer, uint256 amount, string memo, uint8 status)",
    "function invoicesCount() view returns (uint256)",
    "event InvoiceCreated(uint256 indexed id, address indexed seller, address indexed payer, uint256 amount, string memo)",
    "event InvoicePaid(uint256 indexed id, address indexed payer, uint256 amount)",
  ]),
};

export const escrow = {
  address: "0x4cBbeb8c14DaDe28217a5034Df98264e26C8169D" as const,
  abi: parseAbi([
    "function open(address recipient) external payable returns (uint256)",
    "function release(uint256 id) external",
    "function refund(uint256 id) external",
    "function claimPending() external",
    "function dealsCount() view returns (uint256)",
    "event EscrowOpened(uint256 indexed id, address indexed depositor, address indexed recipient, uint256 amount)",
    "event EscrowReleased(uint256 indexed id)",
  ]),
};

export const savingsPool = {
  address: "0xAc666C7Db3e03222fC16d1Af5447F0C6437dB069" as const,
  abi: parseAbi([
    "function deposit() external payable returns (uint256)",
    "function withdraw(uint256 shares) external returns (uint256)",
    "function fundRewards() external payable",
    "function balanceOf(address account) view returns (uint256)",
    "function sharesOf(address) view returns (uint256)",
    "event Deposited(address indexed account, uint256 amount, uint256 shares)",
    "event Withdrawn(address indexed account, uint256 shares, uint256 amount)",
  ]),
};

export const atomicFxPvP = {
  // Set VITE_ATOMIC_FX_PVP_ADDRESS after running `npm run deploy:fx` on Arc Testnet
  address: "0x0000000000000000000000000000000000000000" as const,
  eurcAddress: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const,
  abi: parseAbi([
    "function createQuote(address taker, address buyToken, uint256 buyTokenAmount, uint256 expiry) external payable returns (uint256)",
    "function fillQuote(uint256 id) external",
    "function cancelQuote(uint256 id) external",
    "function claimPendingUsdc() external",
    "function quotesCount() view returns (uint256)",
    "event QuoteCreated(uint256 indexed id, address indexed maker, address indexed taker, address buyToken, uint256 sellUsdcAmount, uint256 buyTokenAmount, uint256 expiry)",
    "event QuoteFilled(uint256 indexed id, address indexed maker, address indexed taker, uint256 sellUsdcAmount, uint256 buyTokenAmount)",
  ]),
};
