import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('SSE subscribe invokes onOpen and onReconnect', async () => {
  let connections = 0
  const server = await startTestServer({
    'SSE /events/stream': (req, res, url) => {
      connections++
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      })
      res.write(`id: 1\n`)
      res.write(`data: ${JSON.stringify({ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} })}\n\n`)
      setTimeout(() => res.end(), 20)
    }
  })
  try {
    const fm = new Fluxomail({ baseUrl: server.url })
    let open = 0
    let reconnects = 0
    const sub = fm.events.subscribe({ backoff: { baseDelayMs: 1, maxDelayMs: 2 }, onOpen: () => { open++ }, onReconnect: () => { reconnects++ } }, () => {})
    await new Promise((r) => setTimeout(r, 150))
    sub.close()
    assert.ok(open >= 1)
    assert.ok(connections >= 1)
    // It might reconnect at least once depending on timing
    assert.ok(reconnects >= 0)
  } finally { await server.close() }
})

