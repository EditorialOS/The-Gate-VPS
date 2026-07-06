# How to Connect — The Gate MCP (Customer Guide)

_Last updated: 2026-07-06 · v1.0.0_

This guide is for **customers** connecting an MCP-capable client to The Gate.

## 1. What you need

- Your **API key** (looks like `gate_sk_xxxxxxxx_...`), provided during onboarding.
  > ⚠️ The key is shown **once**. Store it in a secret manager.
- The MCP endpoint: `https://the-gate-mcp.srv1461270.hstgr.cloud/mcp`

## 2. Add the server to your MCP client

Most clients accept a JSON config. Add:

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

Replace the token with your key. Restart the client to load it.

## 3. Available tools

| Tool | What it does |
|------|--------------|
| `runGate` | Evaluate a draft against a brief; returns a verdict + scorecard |
| `listReviews` | List your past reviews (only yours) |
| `getReview` | Fetch one review by id |

### Example: run an evaluation

```json
{
  "name": "runGate",
  "arguments": {
    "body": {
      "brief": "One-line welcome message for the homepage.",
      "draft": "Welcome to Monterey — where the ocean meets adventure.",
      "mode": "content"
    }
  }
}
```

> Note: request-body fields go **inside `body`**; list filters go inside `query`.

## 4. Quick health check (optional)

```bash
curl -s https://the-gate-mcp.srv1461270.hstgr.cloud/healthz
# {"status":"ok"}
```

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| 401 Unauthorized | Check the `Authorization: Bearer <key>` header and key validity |
| 400 "Required" on runGate | Nest fields under `body` |
| Empty review list | You haven't created any reviews with this key yet |
| Can't reach server | Verify the URL and your network; check `/healthz` |

## 6. Security

- Your key scopes you to **your own data** — you can't see other tenants' reviews.
- Rotate your key by requesting a new one; treat it like a password.
