# Next.js Example (Token + SSE)

This example shows a common browser setup:

- A Next.js API route mints a short‑lived Fluxomail token on the server.
- The browser initializes the SDK with `token` and uses `events.subscribe()` for realtime updates.

Note: Replace the token minting logic with your own server code that calls your `email-service` to create a scoped, short‑lived token.

## Files (Pages Router)

- `pages/api/fluxomail/token.ts`: server route that returns `{ token }`.
- `pages/index.tsx`: simple subscription example using the SDK in the browser.

## Files (App Router)

- `app/api/fluxomail/token/route.ts`: route handler returning `{ token }`.
- `app/page.tsx`: simple subscription example using the SDK in the browser.
