Agent Guide for Fluxomail SDK (JS/TS)
====================================

Scope
-----
This repo contains the JavaScript/TypeScript SDK and CLI for Fluxomail. Goals:

- Tiny, robust client for REST + SSE with great DX.
- Safe defaults: retries for idempotent reads, SSE reconnect, no API keys in browsers.
- Clean CI/release pipeline with reproducible builds and docs updates.

Coding Conventions
------------------
- TypeScript, ESM only.
- Keep surface minimal and typed; prefer non‑breaking changes.
- Avoid adding new runtime dependencies unless critical.
- Public types and methods live in `src/core/types.ts` and `src/index.ts`.
- Follow Conventional Commits (enforced via commitlint).

Testing
-------
- Tests are Node’s built‑in test runner (`node --test`).
- Run locally: `npm test` (builds first).
- Keep tests isolated; prefer small local HTTP servers from `tests/helpers/server.mjs`.
- SSE tests can be timing‑sensitive; keep explicit timeouts small.

CI Policy
---------
- Pull requests:
  - CI runs on Node 18 and 20.
  - OpenAPI drift check is skipped on PRs.
  - CodeQL does not run on PRs (only on main + schedule).
- Main branch:
  - CI runs on Node 18 and 20.
  - Optional OpenAPI drift check runs when `FLUXOMAIL_OPENAPI` is configured as an Actions Variable.
  - CodeQL runs on push and weekly schedule.
- Concurrency is enabled to cancel superseded runs per ref.

OpenAPI Types
-------------
- Generator: `scripts/generate-openapi-types.mjs`.
- If `FLUXOMAIL_OPENAPI` is set (file path or URL), types are generated; otherwise a stub is written to `src/gen/openapi-types.ts`.
- Drift check (CI): `npm run ci:codegen-check` compares the generated file on main.

Releases
--------
We support two clean paths to publish to npm with provenance:

1) Tag‑driven (recommended)
   - Merge to `main`.
   - Set `package.json` to the release version.
   - Tag `vX.Y.Z` and push: `npm run release:tag && npm run release:tag:push`.
   - Workflow `.github/workflows/release.yml` runs tests and publishes with `NPM_TOKEN` (environment: `npm-publish`).

2) Branch‑named release (fast path)
   - Create a branch named exactly the version (with or without leading `v`), e.g. `0.7.0` or `v1.0.6`.
   - Ensure `package.json.version` matches the branch name (without the `v`).
   - Push the branch. Workflow `.github/workflows/release-from-branch.yml` will create tag `vX.Y.Z` for you and push it. The tag triggers the normal publish workflow.

Notes:
- `NPM_TOKEN` must be an npm “Automation” token and is stored as an Environment secret on the `npm-publish` environment.
- If environment approvals are required, approve the job in the Actions UI.
- Publishing is idempotent; if the version already exists on npm, the workflow skips publish.

Branch Protection (Required Checks)
-----------------------------------
- Required checks (exact names) matching CI jobs:
  - `CI / build-and-test (18.x) (pull_request)`
  - `CI / build-and-test (20.x) (pull_request)`
  - `Commitlint / commitlint (pull_request)`
- Optional automation: run the `Update Branch Protection (manual)` workflow with a `GH_ADMIN_TOKEN` repository secret (token must have repo:admin:branch permissions). This sets the above checks on the specified branch (default `main`).

Dry‑run Release
---------------
- Use the `Release` workflow’s manual dispatch to validate without publishing:
  - Inputs: `ref` (e.g., `refs/heads/release/0.4.0`), `dry_run: true`.
  - The job runs build/tests/pack‑check and skips `npm publish`.

Docs (Mintlify)
---------------
- Repo: `../mintlify-docs`.
- For SDK/CLI changes, update:
  - `api-reference/sdks.mdx` (SDK usage, per‑request overrides, SSE callbacks, templates, webhooks).
  - `api-reference/fluxomail/cli.mdx` (CLI commands and flags, .fluxomailrc, scaffolds).
  - Optional endpoints pages: `api-reference/fluxomail/templates.mdx`, `api-reference/fluxomail/webhook-verification.mdx`.
- Open a branch like `docs/sdk-X.Y.Z` and push; open a PR in the docs repo.

Security & Browser Safety
-------------------------
- Never use `apiKey` in the browser; short‑lived tokens only.
- SSE in browsers passes token via query param (headers unavailable in EventSource).
- Webhooks: verify HMAC signature with server‑only helpers in `src/webhooks/`.

CLI Tips
--------
- `whoami` validates auth quickly.
- `init next`, `init next-app`, `init worker` scaffold examples (creates directories).
- `.fluxomailrc` centralizes defaults (apiKey, base, version, tokenCmd).

Infrastructure PRs
------------------
- Branches under `infra/**` automatically open a PR to `main` via `.github/workflows/auto-open-pr.yml`.
 - After pushing, the PR appears within a few seconds; no additional action needed.

When touching CI/Release
------------------------
- Keep PR fast: don’t add heavy steps to PR workflows.
- Keep OpenAPI drift check only on main to avoid PR noise.
- Avoid blocking PRs on CodeQL; let it run on main and on a schedule.

Auto‑publish: Merges to main now bump + tag + publish inline to npm.
\nMinor note: trigger publish.
