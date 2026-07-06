// Minimal MCP Streamable-HTTP client — no SDK needed.
// Speaks JSON-RPC over POST /mcp and parses the SSE response.
const MCP_URL = process.env.GATE_MCP_URL || "https://the-gate-mcp.srv1461270.hstgr.cloud/mcp";
const API_KEY = process.env.GATE_API_KEY;
if (!API_KEY) { console.error("Set GATE_API_KEY to your gate_sk_... key."); process.exit(1); }

let _id = 0;
async function rpc(method, params) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": "Bearer " + API_KEY,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++_id, method, params }),
  });
  const text = await res.text();
  // Response may be SSE ("data: {...}") or plain JSON.
  const line = text.split("\n").find(l => l.startsWith("data: ") && l.includes('"jsonrpc"'));
  const payload = line ? JSON.parse(line.slice(6)) : JSON.parse(text);
  if (payload.error) throw new Error("MCP error: " + JSON.stringify(payload.error));
  return payload.result;
}

// Call a gate tool and parse the "HTTP <status>\n<body>" tool result into JSON.
async function callTool(name, args) {
  const result = await rpc("tools/call", { name, arguments: args });
  const text = result?.content?.[0]?.text ?? "";
  const nl = text.indexOf("\n");
  const status = parseInt(text.slice(0, nl).replace(/[^0-9]/g, ""), 10);
  let body; try { body = JSON.parse(text.slice(nl + 1)); } catch { body = text.slice(nl + 1); }
  return { status, body, isError: !!result?.isError };
}

const __dir = dirname(fileURLToPath(import.meta.url));
const PASS = new Set(["APPROVED", "APPROVED_WITH_NOTES"]);

async function main() {
  const cases = JSON.parse(readFileSync(join(__dir, "dataset.json"), "utf8"));
  console.log("Running " + cases.length + " eval cases against " + MCP_URL + "\n");

  let correct = 0;
  const rows = [];
  for (const c of cases) {
    const { status, body } = await callTool("runGate", { body: { brief: c.brief, draft: c.draft, mode: "content" } });
    const verdict = status === 200 ? body.verdict : ("HTTP " + status);
    const passed = PASS.has(verdict);
    const ok = passed === c.expect_pass;   // did the gate agree with the label?
    if (ok) correct++;
    rows.push({ id: c.id, expected: c.expect_pass ? "PASS" : "FAIL", verdict, agree: ok ? "✓" : "✗" });
  }

  const w = Math.max(...rows.map(r => r.id.length), 4);
  console.log("ID".padEnd(w) + "  EXPECTED  VERDICT                 AGREE");
  console.log("-".repeat(w) + "  --------  ----------------------  -----");
  for (const r of rows)
    console.log(r.id.padEnd(w) + "  " + r.expected.padEnd(8) + "  " + String(r.verdict).padEnd(22) + "  " + r.agree);

  const rate = ((correct / cases.length) * 100).toFixed(1);
  console.log("\nPass-rate (gate agrees with label): " + correct + "/" + cases.length + " = " + rate + "%");
  // Non-zero exit if the eval system regresses below threshold.
  const THRESHOLD = parseFloat(process.env.EVAL_THRESHOLD || "80");
  if (parseFloat(rate) < THRESHOLD) { console.error("Below threshold (" + THRESHOLD + "%)."); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
