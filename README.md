# The Gate — AI Content Evaluation Framework (Agent Tools via MCP)

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.1.0-blue">
  <img alt="status" src="https://img.shields.io/badge/status-production-brightgreen">
  <img alt="evals" src="https://img.shields.io/badge/type-evals%20framework-ff6f00">
  <img alt="agents" src="https://img.shields.io/badge/agent--native-MCP%20tools-8A2BE2">
  <img alt="transport" src="https://img.shields.io/badge/MCP-Streamable--HTTP-8A2BE2">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D22-339933">
  <img alt="tls" src="https://img.shields.io/badge/TLS-Let's%20Encrypt-003A70">
</p>

**The Gate is an evals framework for AI-generated content** — it scores a draft
against a brief across weighted quality dimensions and returns a pass/fail
**verdict + scorecard**. It's exposed as **agent tools over the Model Context
Protocol (MCP)**, deployed **multi-tenant over HTTPS in production**.

> **30-second tour:** [`evals/`](./evals) is the scored eval harness ·
> [`examples/agent/`](./examples/agent) is an autonomous draft→eval→revise agent ·
> [`docs/PRD.md`](./docs/PRD.md) is the product spec · [`EVALS.md`](./EVALS.md)
> documents the scoring rubric.

---

## Why this exists

Teams shipping AI-written content need a **programmatic quality gate** — an evals
layer that decides whether a draft is good enough to publish, and tells you *why*.
The Gate does that, and makes it callable by **any AI agent** as a standard MCP
tool. It's the difference between "we have ideas about evals" and "here's the
eval system in production, with an agent using it, and a PRD."

## What's in this repo

| Path | What it proves |
|------|----------------|
| [`evals/`](./evals) | A **scored eval harness** — dataset of briefs+drafts with expected verdicts, a runner, and a pass-rate report. *"Design an evals framework for our agent."* |
| [`examples/agent/`](./examples/agent) | An **autonomous agent** that calls the gate as an MCP tool in a draft → evaluate → revise-on-fail → re-evaluate loop. *"The agent in production with evals."* |
| [`docs/PRD.md`](./docs/PRD.md) | The **product requirements doc**. |
| [`EVALS.md`](./EVALS.md) | The **scoring rubric** — dimensions, weights, verdict thresholds. |
| [`server.js`](./server.js) | The multi-tenant MCP server (auto-generates tools from `openapi.yaml`). |
| [`RUNBOOK.md`](./RUNBOOK.md) | Operations runbook (deploy, onboard, verify, troubleshoot). |

## The eval tools (via MCP)

| Tool | Purpose |
|------|---------|
| `runGate` | Evaluate a draft against a brief → verdict + weighted scorecard |
| `listReviews` | List past evaluations (tenant-scoped) |
| `getReview` | Fetch a single evaluation by id |

See [`EVALS.md`](./EVALS.md) for the scoring model.

## Live service

| | |
|---|---|
| **MCP endpoint** | `https://the-gate-mcp.srv1461270.hstgr.cloud/mcp` |
| **Health** | `https://the-gate-mcp.srv1461270.hstgr.cloud/healthz` |
| **Transport** | MCP Streamable-HTTP (stateless, multi-tenant) |
| **TLS** | Let's Encrypt (auto-issued via Traefik) |

## Quick start (run the agent against the live gate)

```bash
cd examples/agent
npm install
export GATE_MCP_URL="https://the-gate-mcp.srv1461270.hstgr.cloud/mcp"
export GATE_API_KEY="gate_sk_xxxxxxxx_..."   # your key
node agent.mjs
```

## Run the eval harness

```bash
cd evals
export GATE_MCP_URL="https://the-gate-mcp.srv1461270.hstgr.cloud/mcp"
export GATE_API_KEY="gate_sk_xxxxxxxx_..."
node run-evals.mjs        # prints a pass-rate report vs expected verdicts
```

## Architecture

```
Agent / MCP client ──HTTPS+Bearer──► Traefik (TLS) ──► the-gate-mcp ──► the-gate API ──► Postgres
                                                        (this repo)      (eval engine)
```

Details in [`docs/architecture.md`](./docs/architecture.md).

## Multi-tenancy

The server bakes in **no token**. Each request's `Authorization: Bearer …` is
forwarded to the API, so per-key tenant isolation applies. Verified: two keys see
only their own evaluations; no cross-tenant leakage.

## Versioning & docs

SemVer — current **v1.1.0** ([CHANGELOG](./CHANGELOG.md)). Full docs in
[`docs/`](./docs). License: proprietary © 2026 EditorialOS.
