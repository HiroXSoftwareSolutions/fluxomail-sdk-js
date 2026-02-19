# Changelog

All notable changes to this project will be documented in this file.

This project uses SemVer. During 0.x, breaking changes may occur in minor versions.

## 0.5.1 - 2026-02-19
- security: CLI ignores `tokenCmd` from CWD-discovered `.fluxomailrc` (prevents
  untrusted repos from executing arbitrary shell commands via planted config)
- fix: only set `Content-Type: application/json` on requests with a body,
  avoiding unnecessary CORS preflights on GET requests in browsers
- fix: `init worker` now uses an inlined template instead of reading a file
  not included in the published package
- fix: CONTRIBUTING.md clone URL now points to correct GitHub org

## 0.5.0 - 2026-02-19
- **Breaking**: remove Templates API (no backend implementation)
- feat: `sends.sendGlobal()` — send via the org-level global endpoint
- feat: `preferences.get()` / `preferences.update()` — manage contact preferences
- feat: `events.list({ types })` — filter events by type
- feat: `events.subscribe({ types })` — filter SSE stream by event type
- feat: `PaymentRequiredError` (HTTP 402) for quota enforcement
- fix: codegen script preserves committed types when no OpenAPI spec is available

## 0.4.4 - 2025-09-20
- feat: expose audience module via SDK index export

## 0.4.3 - 2025-09-16
- build: auto-publish workflow now releases on merge without branch-protection conflicts
- docs: release guide documents the merge-triggered publish path

## 0.4.0 - 2025-09-16
- CLI
  - feat: `whoami` command to validate auth quickly
  - feat: `init next`, `init next-app`, and `init worker` scaffolds (create directories as needed)
  - feat: `.fluxomailrc` config support (`apiKey`, `base`, `version`, `tokenCmd`) and `--config <path>`
  - feat: `send --header k:v` to add custom message headers
  - feat: `events backfill --max-pages` to bound historical scans
- SDK
  - feat: per-request overrides for reads (`timeoutMs`, `retry` on events/timelines)
  - feat: SSE callbacks (`onOpen`, `onError`, `onReconnect`) and tunable backoff
  - feat: Templates API (create/get/list/update/delete/render)
  - feat: Webhooks helpers (HMAC SHA256 signature verification + JSON envelope parsing; Node-only)
- DX & Docs
  - docs: README updates for SSE callbacks/backoff, per-request overrides, Templates, Webhooks
  - docs: Mintlify docs updated (CLI features, SDK examples)
- Security & Maintenance
  - chore: add CodeQL workflow and Dependabot config

## 0.3.0 - 2025-09-14
- OpenAPI adoption (phase 2): use generated types in send and events and add compile-time shape checks while keeping public API stable
- Abortable requests across SDK; REST token auto-refresh via `getToken`
- Timelines iterator; SSE resume with `Last-Event-ID` in Node
- Browser attachments: accept `Blob | File` content
- Retry policy configuration for idempotent reads
- Response metadata variants: `listWithMeta`, `getWithMeta`, `sendWithMeta`
- CLI enhancements: `events backfill` with checkpoints, `timelines get`, output formatting (`--format`, `--output`), `--token-cmd`, `--quiet`
- Examples: Next.js (Pages + App Router) and Workers
- Docs: SDK typed subscribe snippet, browser auth, attachments; staging E2E smoke script

## 0.2.0 - 2025-09-14
- Align with public v1 API paths and defaults:
  - Default base URL: `https://api.fluxomail.com/api/v1`
  - Send path: `POST /emails/send`
  - Timeline path: `GET /sends/:id`
- Dynamic User-Agent includes package version in Node (e.g., `fluxomail-sdk-js/0.2.0 node/vXX`)
- Improved HTTP client robustness:
  - Per-attempt timeouts (AbortController per try)
  - Pass `Retry-After` header as `retryAfterMs` on `RateLimitError`
- Tests and coverage improvements; ESM sourcemaps enabled
- New capabilities:
  - `sends.send` supports `cc`, `bcc`, and `attachments` (auto base64 encoding)
  - `events.iterate()` async generator with paging + Retry‑After
  - `events.subscribe()` supports `getToken` refresh + `checkpoint` resume
  - Hooks: `beforeRequest` and `afterResponse` for logging/metrics
  - Browser safety: guard against using `apiKey` in browser by default

## 0.1.0 - Initial release
- Minimal SDK: send, events.list, events.subscribe (SSE), timelines.get
- TypeScript + ESM build, typed errors, retries for idempotent reads
