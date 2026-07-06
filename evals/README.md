# Eval Harness — The Gate

A scored regression harness for the evals system itself. It runs a **labeled
dataset** (brief + draft → expected PASS/FAIL) through the gate, compares the
gate's verdict to the label, and reports an **agreement pass-rate**.

This is the artifact for *"design an evals framework for our agent"* — it treats
the eval system as something you can **measure and regression-test**.

## Files

| File | What |
|------|------|
| `dataset.json` | Labeled cases (strong drafts expected to PASS, weak/off-brief/inaccurate expected to FAIL) |
| `run-evals.mjs` | Runner — calls `runGate` via MCP, scores agreement, prints a report, exits non-zero on regression |

## Run

```bash
export GATE_MCP_URL="https://the-gate-mcp.srv1461270.hstgr.cloud/mcp"
export GATE_API_KEY="gate_sk_xxxxxxxx_..."
export EVAL_THRESHOLD=80         # optional; fail the run below this %
node run-evals.mjs
```

## Example output

```
ID                EXPECTED  VERDICT                 AGREE
----------------  --------  ----------------------  -----
welcome-strong    PASS      APPROVED                ✓
welcome-weak      FAIL      REJECTED                ✓
cta-strong        PASS      APPROVED_WITH_NOTES     ✓
...
Pass-rate (gate agrees with label): 6/6 = 100.0%
```

## Extending

Add cases to `dataset.json` with `expect_pass: true|false`. Keep a balance of
positives and negatives so the harness catches both false-accepts and
false-rejects. Wire `run-evals.mjs` into CI to catch eval drift over time.
