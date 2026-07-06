# Product Requirements Document — The Gate MCP

| | |
|---|---|
| **Product** | The Gate MCP (multi-tenant MCP server for The Gate) |
| **Version** | v1.0.0 |
| **Status** | Released |
| **Owner** | EditorialOS |
| **Last updated** | 2026-07-06 |

## 1. Summary

Expose The Gate (AI-powered editorial quality control) to AI agents and tools via
the **Model Context Protocol**, as a **sellable, multi-tenant** service over HTTPS.
Customers connect their MCP client with an API key and immediately get editorial
evaluation tools, isolated per tenant.

## 2. Problem & motivation

The Gate is valuable as an API, but AI-native workflows (Claude, Cursor, agents)
increasingly consume tools via MCP, not bespoke REST integrations. We need a
standard, secure, low-maintenance way to deliver The Gate to those clients — and
to **monetize** it per customer with clean isolation and simple onboarding.

## 3. Goals

- **G1** — Expose The Gate operations as MCP tools with zero per-endpoint code.
- **G2** — Enforce per-tenant isolation using the API's existing per-key model.
- **G3** — Serve over HTTPS with automatic, renewing TLS.
- **G4** — One-command customer onboarding that issues a key + client config.
- **G5** — Operable and reproducible (runbook, version control, CI, auto-sync).

## 4. Non-goals

- Building a billing/metering system (out of scope for v1).
- A hosted web UI for end users.
- Rewriting or owning The Gate's business logic.

## 5. Users & personas

| Persona | Need |
|---|---|
| **Customer developer** | Add The Gate to their MCP client with a key + config. |
| **Operator (EditorialOS)** | Deploy, onboard customers, monitor, troubleshoot. |
| **AI agent** | Call `runGate`/`listReviews`/`getReview` as tools. |

## 6. Requirements

### Functional
- **F1** Auto-generate one MCP tool per OpenAPI operation.
- **F2** Read the client's `Authorization: Bearer` (or `X-Api-Key`) per request and forward it to the API.
- **F3** Return `HTTP <status>\n<body>` from each tool call.
- **F4** Reject missing tokens with JSON-RPC 401 before any proxying.
- **F5** `provision-customer.sh` mints a key via the API and prints key + config.

### Non-functional
- **N1** Stateless, horizontally scalable (Streamable-HTTP).
- **N2** HTTPS with Let's Encrypt via Traefik; auto-renew.
- **N3** No secrets in the repo; admin secret read at runtime only.
- **N4** Reproducible via Docker + compose; documented in the runbook.

## 7. Success metrics

- Time-to-onboard a new customer: **< 1 minute** (one command).
- Cross-tenant data leakage incidents: **0**.
- Uptime of the MCP endpoint: **≥ 99.5%**.
- Manual steps to keep repo in sync with prod: **0** (automated daily sync).

## 8. Security & privacy

- Per-key tenant isolation enforced by the API.
- Keys stored server-side as **hashes**; raw key shown once at creation.
- Admin secret never printed, logged, or committed.
- TLS everywhere; no plaintext transport.

## 9. Rollout

1. Deploy container on `the-gate-net` with Traefik labels. ✅
2. Verify TLS + health + tool registration. ✅
3. Run isolation tests (two keys, no leakage). ✅
4. Document (runbook, README, docs). ✅
5. Version-control + CI + auto-sync. ✅

## 10. Verification (v1.0.0)

| Test | Result |
|---|---|
| No token → 401 | Pass |
| Bogus key → 401 | Pass |
| Valid key lists only its reviews | Pass |
| Second key sees only its own data | Pass |
| runGate end-to-end verdict | Pass |
| HTTPS + Let's Encrypt cert | Pass |

## 11. Open questions / future work

- Usage metering & billing integration.
- Rate-limit surfacing per tool response.
- Optional per-tool allow-list per customer tier.
- Automated key rotation endpoint.

---
_© 2026 EditorialOS. Proprietary._
