import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('Per-request retry override is honored', async () => {
  let attempts = 0
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      attempts++
      if (attempts < 4) { res.statusCode = 408; res.end('timeout'); return }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ events: [], nextCursor: null }))
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2 } })
    const out = await fm.events.list({ limit: 1, retry: { maxAttempts: 4, retriableStatuses: [408], baseDelayMs: 1, maxDelayMs: 2 } })
    assert.deepEqual(out, { events: [], nextCursor: null })
    assert.equal(attempts, 4)
  } finally { await server.close() }
})

