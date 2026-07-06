# Demo Agent — draft → evaluate → revise (via The Gate MCP)

An autonomous agent that uses The Gate as an **MCP tool** to enforce a quality
gate on generated content. It:

1. Connects to the MCP server and lists tools.
2. Runs a draft through `runGate` (the evals tool).
3. If the verdict is **REVISE / REJECTED**, revises the draft (Anthropic if
   `ANTHROPIC_API_KEY` is set, else a heuristic) and re-evaluates.
4. Stops when the gate returns **APPROVED / APPROVED_WITH_NOTES** or max rounds.

This is the "agent + evals + PRD" loop in one runnable folder.

## Run

```bash
npm install
export GATE_MCP_URL="https://the-gate-mcp.srv1461270.hstgr.cloud/mcp"
export GATE_API_KEY="gate_sk_xxxxxxxx_..."     # required
export ANTHROPIC_API_KEY="sk-ant-..."          # optional (better revisions)
node agent.mjs
```

### Customize

| Env var | Default |
|---------|---------|
| `BRIEF` | Monterey homepage welcome line |
| `DRAFT` | `"Welcome."` (weak on purpose, so the loop revises) |
| `MAX_ROUNDS` | `3` |

## What it demonstrates

- **Agent-native tool use** over MCP (initialize → tools/list → tools/call).
- **Evals in the loop** — decisions driven by the gate's verdict + scorecard.
- **Closed-loop revision** — the agent acts on eval feedback until it passes.
