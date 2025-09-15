# Fluxomail SDK (JS/TS)

![CI](https://github.com/fluxomail/fluxomail-sdk-js/actions/workflows/ci.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/%40fluxomail%2Fsdk.svg)](https://www.npmjs.com/package/@fluxomail/sdk)

Tiny, robust SDK for Fluxomail’s REST + SSE APIs. Focused on minutes-to-first-value: send, list events, subscribe to realtime events, and get a send’s timeline.

- ESM + TypeScript typings
- Typed errors and request IDs for supportability
- Safe defaults: retries for idempotent reads, SSE auto-reconnect, no secrets in browser
- Works in Node >= 18 and modern browsers
- v1 API alignment; cc/bcc/attachments support (incl. Blob/File in browser); iterate/paging helpers
- Abortable requests via AbortSignal; REST token auto-refresh; SSE resume with Last-Event-ID (Node)

## Install

```bash
npm install @fluxomail/sdk
```

## Quickstart

```ts
import { Fluxomail } from '@fluxomail/sdk'
import fs from 'node:fs/promises'

const fm = new Fluxomail({
  apiKey: process.env.FLUXOMAIL_API_KEY, // Node only; do not expose in browser
  // or token: '<short-lived token>'
})

// Send an email (idempotency recommended)
await fm.sends.send({
  to: 'user@example.com',
  from: 'no-reply@yourdomain.com',
  subject: 'Hello',
  html: '<h1>Hi!</h1>',
  idempotencyKey: 'req-123',
  // Optional:
  cc: ['c1@example.com'],
  bcc: 'b1@example.com',
  attachments: [
    { filename: 'report.pdf', content: await fs.promises.readFile('report.pdf'), contentType: 'application/pdf' }
  ]
})

// Backfill events (iterator auto-pages; respects Retry-After)
for await (const evt of fm.events.iterate({ types: ['email.delivered'], limit: 100 })) {
  console.log('event', evt)
}

// Or single page
const { events, nextCursor } = await fm.events.list({
  types: ['email.delivered'],
  limit: 100,
})

// Realtime events (works in Node and browser)
// In browsers, provide getToken() to refresh a short‑lived token and checkpoint to resume
const sub = fm.events.subscribe({
  types: ['email.*'],
  getToken: () => fetch('/api/fluxomail/token', { method: 'POST', body: JSON.stringify({ organizationId }) }).then(r => r.json()).then(x => x.token),
  checkpoint: {
    get: () => localStorage.getItem('fluxo:lastEventId') || undefined,
    set: (id) => localStorage.setItem('fluxo:lastEventId', id)
  }
}, (evt) => {
  console.log('event', evt)
})

// Later
sub.close()

// Get a send’s timeline
const t = await fm.timelines.get({ sendId: 'send_abc123' })

// Iterate a send’s timeline (auto-paging)
for await (const tev of fm.timelines.iterate({ sendId: 'send_abc123', limit: 100 })) {
  console.log('timeline', tev)
}

// Abort a long-running request (example)
const ac = new AbortController()
const p = fm.events.list({ types: ['email.*'], limit: 1000, signal: ac.signal })
ac.abort() // cancels the request

// Typed subscribe (narrowed handler)
fm.events.subscribe({ types: ['email.delivered', 'email.opened'] }, (evt) => {
  // evt is EmailEventEnvelope<'email.delivered' | 'email.opened'>
})
```

## CLI

Install globally or run one‑shot with npx/pnpm/bun:

```bash
# Global
npm i -g @fluxomail/sdk
fluxomail --help

# One‑shot
npx -y @fluxomail/sdk fluxomail --help
pnpm dlx @fluxomail/sdk fluxomail --help
bunx @fluxomail/sdk fluxomail --help

# Examples
fluxomail send --api-key $FLUXOMAIL_API_KEY --to user@example.com --subject "Hi" --text "Hello"
fluxomail events list --api-key $FLUXOMAIL_API_KEY --types email.delivered --limit 50
fluxomail events tail --api-key $FLUXOMAIL_API_KEY --types email.*
fluxomail events backfill --api-key $FLUXOMAIL_API_KEY --types email.* --checkpoint-file .fluxomail.ckpt
fluxomail timelines get --api-key $FLUXOMAIL_API_KEY --send-id send_abc123 --limit 100
```

## Configuration

```ts
new Fluxomail({
  baseUrl?: string // default: https://api.fluxomail.com/api/v1
  apiKey?: string, // server-side only
  token?: string,  // short-lived token for browser/Node
  getToken?: () => Promise<string|undefined> // auto-refresh token on 401
  version?: string // API date header, default e.g. 2025-09-01
  timeoutMs?: number // default: 15_000
  fetch?: typeof fetch // custom fetch if needed
  userAgent?: string // adds to UA in Node (browser ignores)
  allowApiKeyInBrowser?: boolean // default false; throws if apiKey used in browser
  beforeRequest?: (ctx) => void | Promise<void> // hook for logging/metrics
  afterResponse?: (ctx) => void | Promise<void> // hook for logging/metrics
  retry?: { maxAttempts?: number, retriableStatuses?: number[], baseDelayMs?: number, maxDelayMs?: number }
})
```

- API key must never be used in the browser. Use a short-lived token minted by your server.
- The SDK sends `Fluxomail-Version: <date>` on every request to pin behavior.

## Error Handling

All errors extend `FluxomailError` and include `code`, `status`, and optional `requestId`.

```ts
import { FluxomailError, RateLimitError } from '@fluxomail/sdk'

try {
  await fm.events.list({ limit: 10 })
} catch (err) {
  if (err instanceof RateLimitError) {
    // retry later
  } else if (err instanceof FluxomailError) {
    console.error('request failed', err.code, err.status, err.requestId)
  }
}
```

## Browser Auth Pattern

- Create a server route to mint short-lived tokens scoped to the user/org.
- In the browser, initialize with `token` only and call `events.subscribe()` which passes the token to the SSE endpoint as a query parameter.
- Optional: pass `getToken` in the client config to auto-refresh REST requests after a 401.

## Attachments in Browser

- `attachments[].content` accepts `string`, `Uint8Array`, or `Blob | File`.
- The SDK handles base64 conversion for you. Provide `contentType` for best results.

## Development

- Build: `npm run build`
- Test: `npm test`
 - Test: `npm test`
 - E2E smoke (requires staging env vars): `npm run smoke:e2e`

## Examples

- Node quickstart: `examples/node/quickstart.mjs`
- Next.js browser token + SSE: `examples/next/`

## Support Matrix

- Node >= 18
- Evergreen browsers (last two major versions)

## License

Apache-2.0

## Contributing

We welcome contributions! Please see `CONTRIBUTING.md` for local setup, testing, and commit message guidelines (Conventional Commits).

## Code of Conduct

This project follows the Contributor Covenant. By participating, you agree to uphold our `CODE_OF_CONDUCT.md`. For issues, email support@fluxomail.com.
- Use `getToken` in `events.subscribe` for auto-refresh and `checkpoint` to resume after reloads.
## Response Metadata

- Use `listWithMeta`, `getWithMeta`, or `sendWithMeta` to access `requestId`, status, and headers.

```ts
const { data, meta } = await fm.events.listWithMeta({ limit: 1 })
console.log(meta.requestId, meta.status)
```

## Retry Policy

- Configure retry behavior for idempotent reads.

```ts
const fm = new Fluxomail({ apiKey, retry: { maxAttempts: 5, retriableStatuses: [408, 429], baseDelayMs: 200, maxDelayMs: 1500 } })
```
