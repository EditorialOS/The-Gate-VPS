# Architecture — The Gate MCP

_Last updated: 2026-07-06 · v1.0.0_

## Overview

The Gate MCP is a stateless, multi-tenant **Model Context Protocol** server that
exposes The Gate's REST API as MCP tools over HTTPS. It is intentionally thin:
it holds no business logic and no credentials — it translates MCP tool calls into
authenticated HTTP requests and streams responses back.

## Component diagram

```
                         ┌─────────────────────────────┐
   MCP client            │  Traefik (host network)     │
 (Claude, Cursor, ─────► │  :443 TLS (Let's Encrypt)   │
  raw HTTP)   HTTPS      │  Host(the-gate-mcp.srv...)  │
  Bearer gate_sk_...     └──────────────┬──────────────┘
                                        │ bridge IP :3000
                         ┌──────────────▼──────────────┐
                         │  the-gate-mcp (this repo)    │
                         │  express + @mcp/sdk          │
                         │  - parse openapi.yaml (once) │
                         │  - per-request MCP server    │
                         │  - forward Bearer token      │
                         └──────────────┬──────────────┘
                                        │ http://api:8080/api
                         ┌──────────────▼──────────────┐
                         │  the-gate (API)              │
                         │  per-key tenant isolation    │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │  gate-postgres (database)    │
                         └─────────────────────────────┘

  Docker network: the-gate-net  (API aliases: the-gate, api)
```

## Request lifecycle

1. Client sends an MCP JSON-RPC request to `POST /mcp` with
   `Authorization: Bearer <key>`.
2. Server extracts the token. **No token → JSON-RPC 401** immediately.
3. A **request-scoped** `McpServer` is created, bound to that token. The OpenAPI
   spec is parsed once and cached across requests.
4. For `tools/call`, the matching operation is resolved; path params, `query`,
   and `body` are assembled into an HTTP request to the API with the token forwarded.
5. The API applies its own per-key isolation and responds. The server returns
   `HTTP <status>\n<body>` as tool content.

## Design decisions

| Decision | Rationale |
|---|---|
| **Spec-driven tools** | Tool surface tracks `openapi.yaml`; no per-endpoint code. |
| **No baked-in token** | True multi-tenancy — the API, not the MCP, owns isolation. |
| **Request-scoped server** | Clean per-tenant boundary; safe under concurrency. |
| **Stateless Streamable-HTTP** | Horizontally scalable; no session store. |
| **Bundled spec file** | Works even if the API doesn't serve its own spec. |
| **Traefik labels** | Reuses existing ingress + automatic Let's Encrypt TLS. |

## Failure modes & handling

| Condition | Result |
|---|---|
| Missing token | JSON-RPC 401 at MCP layer |
| Invalid token | 401 surfaced from the API |
| Unknown tool | JSON-RPC method/tool error |
| Bad args (e.g. body not nested) | API 400 surfaced in tool result |
| Spec load failure | Startup error logged; fix spec + rebuild |

## Scaling notes

- Stateless — run N replicas behind Traefik; no sticky sessions needed.
- The spec is cached in-process; a rebuild/redeploy refreshes it.
