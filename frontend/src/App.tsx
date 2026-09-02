import { ConnectKitButton } from "connectkit";
import { Balance } from "./components/Balance";
import { PaymentLogPanel } from "./components/PaymentLogPanel";
import { InvoicePanel } from "./components/InvoicePanel";
import { EscrowPanel } from "./components/EscrowPanel";
import { SavingsPoolPanel } from "./components/SavingsPoolPanel";
import "./App.css";

function App() {
  return (
    <div className="app">
      <div className="disclaimer">
        <strong>Disclaimer / 免责声明:</strong> Personal testing only, no warranties, use at your own risk — the
        author is not liable for any loss. 仅供个人测试使用,不作任何承诺,风险自负,由此造成的任何损失作者概不负责。
      </div>
      <header>
        <h1>Arc Starter Kit</h1>
        <p>A frontend for the PaymentLog, Invoice, Escrow, and SavingsPool contracts deployed on Arc Testnet.</p>
        <ConnectKitButton />
      </header>
      <Balance />
      <main className="grid">
        <PaymentLogPanel />
        <InvoicePanel />
        <EscrowPanel />
        <SavingsPoolPanel />
      </main>
    </div>
  );
}

export default App;
