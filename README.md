# The Gate — MCP Server (VPS Deployment)

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.0.0-blue">
  <img alt="status" src="https://img.shields.io/badge/status-production-brightgreen">
  <img alt="transport" src="https://img.shields.io/badge/MCP-Streamable--HTTP-8A2BE2">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D22-339933">
  <img alt="tls" src="https://img.shields.io/badge/TLS-Let's%20Encrypt-003A70">
  <img alt="license" src="https://img.shields.io/badge/license-proprietary-lightgrey">
</p>

Production deployment of **[The Gate](https://github.com/EditorialOS/The-Gate)**
(AI-powered editorial quality control) as a **multi-tenant [Model Context
Protocol](https://modelcontextprotocol.io) server over HTTPS**, running on the
Hostinger VPS. This is the single source of truth for the live `the-gate-mcp`
service — code, container config, customer onboarding, and the operations runbook.

> **Deployment/wrapper repo.** The API application source lives in
> [`EditorialOS/The-Gate`](https://github.com/EditorialOS/The-Gate).

---

## Table of contents
- [Live service](#live-service)
- [What is this?](#what-is-this)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [MCP tools](#mcp-tools)
- [Multi-tenancy](#multi-tenancy)
- [Quick start](#quick-start)
- [Customer onboarding](#customer-onboarding)
- [Client configuration](#client-configuration)
- [Operations](#operations)
- [Versioning](#versioning)
- [License](#license)

---

## Live service

| | |
|---|---|
| **MCP endpoint** | `https://the-gate-mcp.srv1461270.hstgr.cloud/mcp` |
| **Health** | `https://the-gate-mcp.srv1461270.hstgr.cloud/healthz` → `{"status":"ok"}` |
| **Transport** | MCP Streamable-HTTP (stateless) |
| **TLS** | Let's Encrypt (auto-issued via Traefik) |
| **VPS path** | `/opt/the-gate-mcp/` on `187.124.87.148` |

## What is this?

A thin, generic MCP server that turns The Gate's REST API into MCP tools. On
startup it reads `openapi.yaml` and **auto-generates one MCP tool per API
operation** — so the tool surface always tracks the spec. It is **multi-tenant**:
it forwards each client's bearer token to the API, so the API's own per-key
isolation applies. No shared credential is baked in.

## Architecture

```
Client (Claude / Cursor / raw HTTP)
        │  HTTPS + Bearer gate_sk_...
        ▼
Traefik  (host-networked, :80/:443, Let's Encrypt)
        │  Host(the-gate-mcp.srv1461270.hstgr.cloud)
        ▼
the-gate-mcp  (this repo, container :3000)
        │  forwards the SAME bearer token → http://api:8080/api
        ▼
the-gate  (API, container :8080)
        ▼
gate-postgres  (database)
```

All app containers share the Docker network `the-gate-net`.

## Repository layout

```
.
├── server.js              # Auto-generating multi-tenant MCP server
├── openapi.yaml           # The Gate spec — source of truth for tools
├── package.json           # Node package (v1.0.0)
├── Dockerfile             # node:22-alpine build
├── docker-compose.yml     # Service + Traefik labels
├── provision-customer.sh  # One-command customer onboarding
├── RUNBOOK.md             # Operations runbook (start here to operate)
├── CHANGELOG.md           # Semantic-versioned change history
├── CONTRIBUTING.md        # Dev workflow & conventions
├── .env.example           # Environment template
├── VERSION                # Current version string
├── LICENSE                # Proprietary license
└── .github/workflows/ci.yml  # Build + compose validation
```

## MCP tools

| Tool | HTTP | Args |
|------|------|------|
| `runGate` | `POST /api/gate` | `{ body: { brief, draft, voice_guide?, mode } }` |
| `listReviews` | `GET /api/gate/reviews` | `{ query?: { limit, offset, verdict } }` |
| `getReview` | `GET /api/gate/reviews/{id}` | `{ id }` |

Tools are generated from `openapi.yaml` — add operations there and they appear
automatically after a rebuild.

## Multi-tenancy

- The server bakes in **no token**. Each request's `Authorization: Bearer …`
  (or `X-Api-Key`) is read and forwarded to the API.
- A **request-scoped** MCP server is built per token; the spec is parsed once and cached.
- **No token → JSON-RPC 401** at the MCP layer. **Bad token → 401** from the API.
- Verified: two keys see only their own reviews; no cross-tenant leakage.

## Quick start

```bash
# On the VPS
cd /opt/the-gate-mcp
docker compose up -d --build      # deploy / redeploy
curl -s https://the-gate-mcp.srv1461270.hstgr.cloud/healthz
```

See [`RUNBOOK.md`](./RUNBOOK.md) for full details.

## Customer onboarding

```bash
cd /opt/the-gate-mcp
bash provision-customer.sh "Customer Name"
```

Mints a key via the API (never raw SQL), reads the admin secret at runtime
(never printed), and prints the raw key **(shown once)** plus a ready-to-paste
client config.

## Client configuration

```json
{
  "mcpServers": {
    "the-gate": {
      "url": "https://the-gate-mcp.srv1461270.hstgr.cloud/mcp",
      "transport": "streamable-http",
      "headers": { "Authorization": "Bearer gate_sk_xxxxxxxx_..." }
    }
  }
}
```

## Operations

Routine commands, TLS/Traefik notes, smoke + isolation tests, and a
troubleshooting matrix live in **[`RUNBOOK.md`](./RUNBOOK.md)**.

## Versioning

This project follows [Semantic Versioning](https://semver.org). Current release:
**v1.0.0** (see [`CHANGELOG.md`](./CHANGELOG.md)).

## License

Proprietary — © 2026 EditorialOS. All rights reserved. See [`LICENSE`](./LICENSE).
