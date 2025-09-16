# Changelog

All notable changes to this project will be documented in this file.

This project uses SemVer. During 0.x, breaking changes may occur in minor versions.

## [0.3.4](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/compare/v0.3.3...v0.3.4) (2025-09-15)


### Bug Fixes

* **release:** also trigger on release published; add manual dispatch ref ([#29](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/29)) ([b204c3b](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/b204c3b727999f60b22a809d8f3a3ecad75b20d3))

## [0.3.3](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/compare/v0.3.2...v0.3.3) (2025-09-15)


### Bug Fixes

* **release:** document manual bump via workflow input or patch commit ([#27](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/27)) ([71b480d](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/71b480d3d4d3fa3c04cb5e0c8963146b89fcb333))

## [0.3.2](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/compare/v0.3.1...v0.3.2) (2025-09-15)


### Bug Fixes

* **pkg:** align repository/bugs URLs with repo for npm provenance ([#23](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/23)) ([28310bd](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/28310bd395a1978a5d7e9df6d412517888a5b332))

## [0.3.1](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/compare/v0.3.0...v0.3.1) (2025-09-15)


### Bug Fixes

* **ci:** allow Release Please to use PAT if provided ([#21](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/21)) ([e79f006](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/e79f0066069bb5dc6a38968078f709e1a68abf64))
* **ci:** commit OpenAPI types and add local build to pre-commit ([#19](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/19)) ([8953dbd](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/8953dbdacd2e79293b81a2e6ba89cc3ee00a3354))
* **ci:** warn on OpenAPI drift; fix release-please tags ([#20](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/20)) ([ff7cfb6](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/ff7cfb61b199be7e66232177a98e29d4ed815c54))
* **codegen:** stub types when FLUXOMAIL_OPENAPI missing; remove local fallback ([#18](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/issues/18)) ([78470a6](https://github.com/HiroXSoftwareSolutions/fluxomail-sdk-js/commit/78470a6827d3e8deec8ddcad5fdb24d6899732d9))

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
