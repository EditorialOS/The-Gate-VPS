# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-07-06

### Added
- **Repositioned as an evals framework** — README + PRD now lead with the
  content-evaluation/scoring model and agent-tool framing.
- **`EVALS.md`** — documents the scoring rubric: dimensions, weights, and verdict thresholds.
- **`examples/agent/`** — an autonomous draft → evaluate → revise-on-fail → re-evaluate
  agent that uses The Gate as an MCP tool (optional Anthropic-backed revision).
- **`evals/`** — a scored regression harness: labeled dataset + runner that reports
  a gate-vs-label agreement pass-rate and fails below a threshold (CI-friendly).

### Changed
- README restructured around a 30-second tour (evals/, examples/agent/, docs/PRD.md).

## [1.0.0] - 2026-06-15

### Added
- Initial production release of **The Gate MCP** — a multi-tenant MCP server
  wrapping The Gate REST API over HTTPS.
- Auto-generating tool layer (one MCP tool per OpenAPI operation).
- Per-request multi-tenancy (forwards each client's bearer token).
- Streamable-HTTP transport, Docker + Traefik/Let's Encrypt TLS.
- `provision-customer.sh` onboarding, `RUNBOOK.md`, CI, docs, auto-sync workflow.

[Unreleased]: https://github.com/EditorialOS/The-Gate-VPS/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/EditorialOS/The-Gate-VPS/releases/tag/v1.1.0
[1.0.0]: https://github.com/EditorialOS/The-Gate-VPS/releases/tag/v1.0.0
