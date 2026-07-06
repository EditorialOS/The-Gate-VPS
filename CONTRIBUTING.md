# Contributing

Thanks for helping improve **The Gate MCP**.

## Ground rules
- **Never commit secrets.** `.env`, keys, and tokens are git-ignored — keep it that way.
- **Mint API keys through the API endpoint**, never via raw SQL (the schema stores a key hash).
- Use **namespace imports** in `server.js` (e.g. `import * as zodMod from "zod"; const z = zodMod.z`) — named imports have failed at runtime in-container.

## Workflow
1. Branch from `main`: `git checkout -b feat/<short-name>`.
2. Make changes; keep them focused.
3. Run the local checks:
   ```bash
   docker compose config          # validate compose
   docker compose build           # validate image build
   ```
4. Update `CHANGELOG.md` under **[Unreleased]**.
5. Open a PR into `main`. CI must pass.

## Versioning
This project follows [Semantic Versioning](https://semver.org). Bump `version`
in `package.json` and move the `CHANGELOG` **[Unreleased]** section to a new
version heading when cutting a release. Tag as `vX.Y.Z`.

## Deploying
See [`RUNBOOK.md`](./RUNBOOK.md). In short, on the VPS:
```bash
cd /opt/the-gate-mcp && docker compose up -d --build
```
