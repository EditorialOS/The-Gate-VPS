# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-06

### Added
- Initial production release of **The Gate MCP** — a multi-tenant Model Context
  Protocol (MCP) server that wraps The Gate REST API over HTTPS.
- Auto-generating tool layer: parses `openapi.yaml` on startup and registers one
  MCP tool per API operation (`runGate`, `listReviews`, `getReview`).
- Per-request multi-tenancy: forwards each client's `Authorization: Bearer` token
  to the API so the API's per-key tenant isolation applies. No shared token baked in.
- Streamable-HTTP transport (stateless), request-scoped MCP server per token.
- Dockerfile + docker-compose with Traefik labels for automatic Let's Encrypt TLS.
- `provision-customer.sh` — one-command customer onboarding that mints a key via
  the API (never raw SQL) and prints a ready-to-paste client config.
- `RUNBOOK.md` — full operations runbook (topology, ops, onboarding, verification,
  troubleshooting).
- CI workflow validating the Docker build and compose config on every push.
- Automated VPS → GitHub sync workflow (see README).

### Security
- Admin secret is read at runtime from the API container and never printed or stored.
- `.gitignore` excludes `.env`, keys, and secrets.

[Unreleased]: https://github.com/EditorialOS/The-Gate-VPS/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/EditorialOS/The-Gate-VPS/releases/tag/v1.0.0
