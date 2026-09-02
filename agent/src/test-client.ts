import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/server.ts"],
    cwd: process.cwd(),
    env: { PATH: process.env.PATH || "" },
  });

  const client = new Client({ name: "test-client", version: "0.1.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("Tools:", tools.tools.map((t) => t.name));

  console.log("\n--- get_balance ---");
  const balance = await client.callTool({ name: "get_balance", arguments: {} });
  console.log(balance.content);

  console.log("\n--- send_payment (over cap, should be rejected) ---");
  const overCap = await client.callTool({
    name: "send_payment",
    arguments: { to: "0x7D4F55C89eC6e57Ba289467789271f320f7561Fe", amount: "5.0", memo: "test over cap" },
  });
  console.log("isError:", overCap.isError, overCap.content);

  console.log("\n--- send_payment (valid address, not on allowlist, should be rejected) ---");
  const notAllowed = await client.callTool({
    name: "send_payment",
    // a real deployed contract address from this kit, just not one in ALLOWLIST
    arguments: { to: "0xd010C9b04202ABC4598Ece27523E0CCbd0dE58ed", amount: "0.01", memo: "test not allowed" },
  });
  console.log("isError:", notAllowed.isError, notAllowed.content);

  console.log("\n--- send_payment (valid, should succeed) ---");
  const ok = await client.callTool({
    name: "send_payment",
    arguments: { to: "0x7D4F55C89eC6e57Ba289467789271f320f7561Fe", amount: "0.02", memo: "agent test payment" },
  });
  console.log("isError:", ok.isError, ok.content);

  console.log("\n--- list_recent_payments ---");
  const recent = await client.callTool({ name: "list_recent_payments", arguments: { limit: 5 } });
  console.log(recent.content);

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
