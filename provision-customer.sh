#!/usr/bin/env bash
# provision-customer.sh "Customer Name"
# Mints a NEW isolated Gate API key via the API (not raw SQL) and prints
# the raw key (shown once) + ready-to-paste MCP client config.
set -euo pipefail

NAME="${1:-}"
if [ -z "$NAME" ]; then echo "Usage: $0 \"Customer Name\""; exit 1; fi

API_CONTAINER="the-gate"
SECRET_VAR="GATE_ADMIN_SECRET"
API_BASE="http://localhost:8081/api"          # host-side mapping of the API
MCP_URL="https://the-gate-mcp.example.com/mcp"

# Read admin secret at runtime from the API container env — never printed.
ADMIN_SECRET="$(docker exec "$API_CONTAINER" printenv "$SECRET_VAR")"

RESP="$(curl -sS -X POST "$API_BASE/gate/keys" \
  -H 'Content-Type: application/json' \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{\"name\":\"$NAME\",\"rateLimitPerHour\":100}")"

KEY="$(printf '%s' "$RESP" | sed -n 's/.*\"key\":\"\([^\"]*\)\".*/\1/p')"
if [ -z "$KEY" ]; then echo "Failed to mint key. API said:"; echo "$RESP"; exit 1; fi

cat <<EOF

✅ Provisioned customer: $NAME
⚠️  This raw key is shown ONCE. Only its hash is stored server-side. Save it now.

API key: $KEY

── Paste into the customer's MCP client config ──────────────
{
  "mcpServers": {
    "the-gate": {
      "url": "$MCP_URL",
      "transport": "streamable-http",
      "headers": { "Authorization": "Bearer $KEY" }
    }
  }
}
─────────────────────────────────────────────────────────────
EOF
