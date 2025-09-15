## Summary

Explain what this PR changes and why. Keep it concise but include context for reviewers.

## Changes

- [ ] SDK: core/API changes
- [ ] CLI changes (flags, commands)
- [ ] Docs/Mintlify
- [ ] Build/CI

## Public API

- Affects public types or methods? If yes, describe surface and compatibility.

## OpenAPI Codegen

- [ ] Ran `npm run ci:codegen-check` (or CI ran with `FLUXOMAIL_OPENAPI`) and confirmed no drift in `src/gen/openapi-types.ts`.

## Testing

- [ ] Unit tests pass: `npm test`
- [ ] E2E smoke (staging): `npm run smoke:e2e` with staging env
  - `FLUXOMAIL_BASE_URL=`
  - `FLUXOMAIL_API_KEY=` or `FLUXOMAIL_TOKEN_CMD=`

## Release Notes (proposed)

Provide a brief changelog entry for this PR (if user‑visible).

## Checklist

- [ ] Code follows repo conventions and passes CI
- [ ] Docs updated (README/Mintlify as needed)
- [ ] Linked issues or tickets

