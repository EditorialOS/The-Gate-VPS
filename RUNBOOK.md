# The Gate — Operations Runbook

AI-powered editorial quality-control API, exposed as a **multi-tenant MCP
server over HTTPS**. This runbook covers the live deployment on the Hostinger
VPS: how it's wired, how to operate it, how to onboard customers, and how to
troubleshoot.

---

## 1. At a glance

| | |
|---|---|
| **Public MCP URL** | `https://the-gate-mcp.srv1461270.hstgr.cloud/mcp` |
| **Health** | `https://the-gate-mcp.srv1461270.hstgr.cloud/healthz` → `{"status":"ok"}` |
| **VPS** | `187.124.87.148` (user `root`, SSH key `the_gate_deploy`) |
| **Public hostname** | `srv1461270.hstgr.cloud` (wildcard `*.srv1461270.hstgr.cloud` resolves to the box) |
| **TLS** | Let's Encrypt via existing host-networked Traefik (`certresolver=letsencrypt`) |
| **Transport** | MCP Streamable-HTTP (stateless) |
| **Auth model** | Per-request `Authorization: Bearer gate_sk_...` forwarded to the API → API enforces per-key tenant isolation |

---

## 2. Topology

```
Client (Claude / Cursor / raw HTTP)
        │  HTTPS  Bearer gate_sk_...
        ▼
Traefik (host-networked, :80/:443)         ── Let's Encrypt cert
        │  routes Host(the-gate-mcp.srv1461270.hstgr.cloud)
        ▼
the-gate-mcp  (container, :3000)           ── this repo /opt/the-gate-mcp
        │  forwards the SAME bearer token
        │  http://api:8080/api
        ▼
the-gate  (API container, :8080)           ── /opt/the-gate
        │
        ▼
gate-postgres  (DB container)
```

- All three app containers share the Docker network **`the-gate-net`**
  (API aliases: `the-gate`, `api`).
- Traefik is **host-networked** — it reaches the MCP container via the bridge
  IP. Do **not** `docker network connect` Traefik to `the-gate-net`.

---

## 3. Hosts & paths

| Path on VPS | What |
|---|---|
| `/opt/the-gate/` | The Gate API + Postgres (`docker-compose.yml`) |
| `/opt/the-gate-mcp/` | The MCP wrapper (this runbook lives here) |
| `/opt/the-gate-mcp/server.js` | Auto-generating MCP server (Node, express + MCP SDK) |
| `/opt/the-gate-mcp/openapi.yaml` | The Gate's OpenAPI spec (source of truth for tools) |
| `/opt/the-gate-mcp/docker-compose.yml` | MCP service + Traefik labels |
| `/opt/the-gate-mcp/Dockerfile` | node:22-alpine build |
| `/opt/the-gate-mcp/provision-customer.sh` | One-command customer onboarding |

---

## 4. API surface (what the MCP exposes)

The MCP parses `openapi.yaml` on startup and registers **one tool per
operation**. Current tools:

| MCP tool | HTTP | Auth | Notes |
|---|---|---|---|
| `runGate` | `POST /api/gate` | Bearer | Evaluate a draft. Args nested under `body`: `{brief, draft, voice_guide?, mode}` |
| `listReviews` | `GET /api/gate/reviews` | Bearer | Key-scoped list. Optional `query`: `{limit, offset, verdict}` |
| `getReview` | `GET /api/gate/reviews/{id}` | Bearer | Key-scoped single review |

Admin (not exposed via MCP — server-side only):
- `POST /api/gate/keys` with header `x-admin-secret: $GATE_ADMIN_SECRET` → mints a key.

> **Tool input shape:** every tool takes path params as top-level string args,
> plus an optional `query` object and (for POST/PUT/PATCH) an optional `body`
> object. e.g. `runGate` → `{ "body": { "brief": "...", "draft": "..." } }`.

---

## 5. Multi-tenancy (how isolation works)

- The MCP server **bakes in no token.** It reads each request's
  `Authorization: Bearer ...` (or `X-Api-Key`) and forwards THAT to the API.
- A **request-scoped** MCP server is built per token; the spec is parsed once
  and cached.
- The Gate API enforces isolation by key — reviews are visible only to the key
  that created them.
- **No token → JSON-RPC 401** at the MCP layer (before any proxying).
- **Bad token → 401** from the API, surfaced back through the tool result.

---

## 6. Routine operations

All commands run on the VPS in `/opt/the-gate-mcp`.

```bash
# SSH in
ssh -i ~/.ssh/the_gate_deploy root@187.124.87.148

cd /opt/the-gate-mcp

docker compose ps                 # status
docker compose logs -f mcp        # tail MCP logs
docker logs --tail 50 the-gate-mcp
docker compose restart            # restart MCP
docker compose up -d --build      # rebuild + redeploy after editing files
docker compose down               # stop MCP

# The API itself:
cd /opt/the-gate && docker compose ps | logs -f | restart
```

**After editing `server.js` or `openapi.yaml`:** `docker compose up -d --build`
then re-run the smoke test (section 8).

---

## 7. Customer onboarding (one command)

```bash
cd /opt/the-gate-mcp
bash provision-customer.sh "Customer Name"
```

What it does:
1. Reads the admin secret at runtime via `docker exec the-gate printenv GATE_ADMIN_SECRET` — **never printed**.
2. Mints a key through the **API endpoint** `POST /api/gate/keys` (NOT raw SQL — the schema stores only a key *hash*, so raw inserts would break auth).
3. Prints the **raw key (shown once)** + a ready-to-paste MCP client config.

> ⚠️ The raw key is shown **once**. Only its hash is stored server-side. Save it
> immediately; it cannot be recovered.

### Sample client config (handed to the customer)
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

---

## 8. Verification / smoke tests

> **Quoting gotcha:** PowerShell → ssh → bash mangles nested quotes. Base64-encode
> remote scripts (`echo <b64> | base64 -d | bash`). For curl, a mis-quoted
> `Authorization` header makes curl treat "Bearer" as a hostname → silent auth
> failure. Always check raw output.

```bash
URL=https://the-gate-mcp.srv1461270.hstgr.cloud/mcp
H1='Content-Type: application/json'
H2='Accept: application/json, text/event-stream'
KEY=gate_sk_...        # a valid customer key

# Health
curl -sS https://the-gate-mcp.srv1461270.hstgr.cloud/healthz   # {"status":"ok"}

# No token -> 401
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$URL" -H "$H1" -H "$H2" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"v","version":"1"}}}'

# tools/list (valid token)
curl -sS -X POST "$URL" -H "$H1" -H "$H2" -H "Authorization: Bearer $KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# runGate (note body nesting)
curl -sS -X POST "$URL" -H "$H1" -H "$H2" -H "Authorization: Bearer $KEY" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"runGate","arguments":{"body":{"brief":"Tagline test.","draft":"Welcome to Monterey.","mode":"content"}}}}'
```

### Isolation test (two keys)
1. Key A `listReviews` → note count.
2. Key B `listReviews` → independent count.
3. Key B `runGate` → creates a review.
4. Key A `listReviews` → **unchanged** (no leak).
5. Key B `listReviews` → +1 (only its own).
6. Bogus key → **401** from API.

Last verified: all six pass.

---

## 9. TLS / Traefik

- Cert is issued automatically on first HTTPS hit to the Host rule. Allow ~20s.
- Verify issuer:
  ```bash
  echo | openssl s_client -servername the-gate-mcp.srv1461270.hstgr.cloud \
    -connect the-gate-mcp.srv1461270.hstgr.cloud:443 2>/dev/null \
    | openssl x509 -noout -issuer -subject
  ```
- The MCP `docker-compose.yml` Traefik labels:
  ```
  traefik.enable=true
  traefik.docker.network=the-gate-net
  traefik.http.routers.thegatemcp.entrypoints=websecure
  traefik.http.routers.thegatemcp.rule=Host(\`the-gate-mcp.srv1461270.hstgr.cloud\`)
  traefik.http.routers.thegatemcp.tls.certresolver=letsencrypt
  traefik.http.services.thegatemcp.loadbalancer.server.port=3000
  ```

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `spec load failed (file + http): 404` | `openapi.yaml` not bundled / wrong spec | Ensure `COPY ... openapi.yaml` in Dockerfile; `docker compose up -d --build` |
| Tool call → HTTP 400 "Required" | Body args not nested under `body` | Pass `{"body":{...}}` |
| Tools list shows wrong/extra tools | Stale or wrong spec | Replace `openapi.yaml`, rebuild |
| 404 on a tool's HTTP call | Spec path doesn't match real API route | Confirm route with `docker exec the-gate wget -qO- ...`; fix spec |
| No HTTPS / cert error | DNS or Traefik label issue | Check `getent hosts <host>`, Traefik logs, wait 20s |
| 401 everywhere with a good key | Mis-quoted curl header | Re-check `Authorization: Bearer <key>` quoting |
| MCP container won't start | JS import/runtime error | `docker logs the-gate-mcp`; use namespace imports (see Gotchas) |

### Implementation gotchas (learned the hard way)
- **Namespace imports** in `server.js`: `import * as zodMod from "zod"; const z = zodMod.z || zodMod.default || zodMod;` — named `{ z }` failed at runtime in-container. Same pattern for `fs.readFileSync`.
- **Mint keys via the API endpoint, never raw SQL** — the workspace row needs a key hash.
- **Base64 every remote script & file write** through the PowerShell→ssh→bash chain.
- **Find a public-resolving hostname** so Let's Encrypt's HTTP-01 challenge succeeds (Hostinger's `*.srvNNN.hstgr.cloud` wildcard works).

---

## 11. Secrets (store in a vault, not here)

- Postgres password, `GATE_ADMIN_SECRET`, Anthropic API key, customer Gate keys.
- The admin secret lives only in the API container env (`GATE_ADMIN_SECRET`);
  the onboarding script reads it at runtime and never prints it.
- Rotate the Anthropic key if it ever appeared in chat/logs.

---

_Last updated: 2026-06-15_
