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

// Optional: use Anthropic to revise the draft when the gate says REVISE/REJECTED.
// Falls back to a simple heuristic revision if no ANTHROPIC_API_KEY is set.
async function reviseDraft(brief, draft, notes) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // Heuristic fallback: tighten opening + append a concrete detail cue.
    return draft.replace(/^\s*/, "").split(". ").map(s => s.trim()).filter(Boolean).join(". ")
      + " (Revised to address: " + (notes || []).join("; ") + ")";
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 500,
      messages: [{ role: "user", content:
        "Revise the DRAFT to satisfy the BRIEF and fix these NOTES. Return only the revised draft.\n\n" +
        "BRIEF:\n" + brief + "\n\nDRAFT:\n" + draft + "\n\nNOTES:\n" + (notes || []).join("\n") }],
    }),
  });
  const j = await res.json();
  return j?.content?.[0]?.text?.trim() || draft;
}

const PASS = new Set(["APPROVED", "APPROVED_WITH_NOTES"]);

async function main() {
  const brief = process.env.BRIEF ||
    "Write a one-line welcome message for the See Monterey homepage. Warm, specific, under 15 words.";
  let draft = process.env.DRAFT ||
    "Welcome.";                                   // deliberately weak so the loop revises
  const maxRounds = parseInt(process.env.MAX_ROUNDS || "3", 10);

  console.log("🔌 Connecting to The Gate via MCP:", MCP_URL);
  const init = await rpc("initialize", {
    protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "gate-demo-agent", version: "1.0.0" },
  });
  console.log("✅ Connected. Server:", init?.serverInfo?.name || "the-gate-mcp");
  const tools = await rpc("tools/list", {});
  console.log("🛠  Tools:", (tools.tools || []).map(t => t.name).join(", "));

  for (let round = 1; round <= maxRounds; round++) {
    console.log("\n── Round " + round + " ──");
    console.log("DRAFT:", JSON.stringify(draft));
    const { status, body } = await callTool("runGate", { body: { brief, draft, mode: "content" } });
    if (status !== 200) { console.error("Gate call failed:", status, body); process.exit(1); }
    const verdict = body.verdict;
    const score = body.weighted_score ?? body.weightedScore;
    console.log("VERDICT:", verdict, "| score:", score);
    if (PASS.has(verdict)) {
      console.log("\n🎉 Passed the gate in round " + round + ". Final draft:\n" + draft);
      return;
    }
    const notes = body.notes || (body.scores ? Object.values(body.scores).map(s => s.rationale).filter(Boolean) : []);
    console.log("↻ Revising to address:", notes.slice(0, 3));
    draft = await reviseDraft(brief, draft, notes);
  }
  console.log("\n⚠️ Did not pass after " + maxRounds + " rounds. Last draft:\n" + draft);
}

main().catch(e => { console.error(e); process.exit(1); });
