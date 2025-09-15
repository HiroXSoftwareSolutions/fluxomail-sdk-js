Release 0.3.0: OpenAPI adoption, CLI enhancements, CI codegen drift, examples

Summary
- Phase 2 OpenAPI adoption: generated types used internally for `send`, `events.list`, `timelines.get` with compile-time shape checks; public API unchanged.
- Resilience/DX: AbortSignal on requests, REST token auto-refresh, timelines iterator, SSE resume (Last-Event-ID in Node), Blob/File attachments.
- CLI: `events backfill` with checkpoints, `timelines get`, formatting (`--format`, `--output`, `--quiet`), `--token-cmd` for short-lived tokens.
- CI & E2E: optional OpenAPI codegen drift gate; staging smoke workflow.
- Docs & Examples: Next.js (Pages + App Router), Workers; typed subscribe snippet; release guide & PR template.

Changes
- OpenAPI: src/core/openapi.ts (type aliases, mapping, compile-time checks)
- APIs: events.list/iterate, timelines.get/iterate, sends.send/sendWithMeta adopt OpenAPI types internally
- CLI: formatting/output, token-cmd, backfill & timelines get
- Scripts: codegen, drift check, E2E smoke
- Workflows: CI drift (env FLUXOMAIL_OPENAPI), openapi-check (manual), E2E staging (manual)
- Docs: README, Mintlify SDKs page, CHANGELOG 0.3.0, RELEASE.md, PR template

Public API
- No breaking changes. Added withMeta helpers and typed subscribe overload.

Testing
- Unit tests: 28/28 passing; global test timeout to avoid hangs.
- E2E smoke script provided (run with staging env: FLUXOMAIL_BASE_URL + API key or token cmd).

Release Notes
- OpenAPI adoption (phase 2) with compile-time checks; no public API breaks
- AbortSignal, token auto-refresh, timelines iterator; SSE resume (Last-Event-ID)
- Browser attachments (Blob/File)
- Retry policy config; withMeta variants
- CLI: events backfill (checkpoint), timelines get, output formatting, token-cmd
- CI: optional codegen drift via FLUXOMAIL_OPENAPI; staging E2E workflow
- Docs/examples updated (Next.js Pages/App, Workers)
