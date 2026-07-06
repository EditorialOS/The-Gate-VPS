# The Gate — VPS Deployment (MCP Server)

This repo holds the **operational deployment** of [The Gate](https://github.com/EditorialOS/The-Gate)
as a **multi-tenant MCP (Model Context Protocol) server over HTTPS**, running on
the Hostinger VPS. It is the single source of truth for the running `the-gate-mcp`
service — code, container config, onboarding, and the operations runbook.

> This is the deployment/wrapper repo. The API application source lives in
> `EditorialOS/The-Gate`.

## What's here

| File | Purpose |
|------|---------|
| `server.js` | Auto-generating MCP server (Node, express + @modelcontextprotocol/sdk Streamable-HTTP). Parses `openapi.yaml` and registers one MCP tool per API operation. Multi-tenant: forwards each request's `Authorization: Bearer` to the API. |
| `openapi.yaml` | The Gate's OpenAPI spec — source of truth for the exposed tools (`runGate`, `listReviews`, `getReview`). |
| `package.json` | Node dependencies. |
| `Dockerfile` | node:22-alpine build. |
| `docker-compose.yml` | MCP service + Traefik labels (TLS via Let's Encrypt). |
| `provision-customer.sh` | One-command customer onboarding — mints an API key via the API and prints a ready-to-paste client config. |
| `RUNBOOK.md` | **Operations runbook** — deploy, operate, onboard, verify, troubleshoot. Start here. |

## Live service

- **MCP endpoint:** `https://the-gate-mcp.srv1461270.hstgr.cloud/mcp`
- **Health:** `https://the-gate-mcp.srv1461270.hstgr.cloud/healthz`
- **VPS path:** `/opt/the-gate-mcp/` on `187.124.87.148`

## Quick start

See [`RUNBOOK.md`](./RUNBOOK.md) for everything: topology, routine `docker compose`
commands, customer onboarding, smoke/isolation tests, TLS notes, and troubleshooting.

```bash
# Onboard a customer
cd /opt/the-gate-mcp && bash provision-customer.sh "Customer Name"
```

## Sample client config

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
