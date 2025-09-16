import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail, TimeoutError } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('Per-request timeout override is honored', async () => {
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      // never respond
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, timeoutMs: 5000 })
    await assert.rejects(() => fm.events.list({ timeoutMs: 50 }), (e) => e instanceof TimeoutError)
  } finally { await server.close() }
})

