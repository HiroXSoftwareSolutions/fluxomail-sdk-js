# Changelog

All notable changes to this project will be documented in this file.

This project uses SemVer. During 0.x, breaking changes may occur in minor versions.

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
