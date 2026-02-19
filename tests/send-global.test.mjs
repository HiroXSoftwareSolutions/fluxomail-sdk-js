import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('sends.sendGlobal hits /emails/send-global endpoint', async () => {
  let lastPath = ''
  let body = ''
  const server = await startTestServer({
    'POST /emails/send-global': async (req, res, url) => {
      lastPath = url.pathname
      for await (const c of req) body += c
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ sendId: 'snd_global_1' }))
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url })
    const res = await fm.sends.sendGlobal({
      to: 'user@example.com',
      subject: 'Test global',
      content: 'Hello global',
    })
    assert.equal(res.sendId, 'snd_global_1')
    assert.equal(lastPath, '/emails/send-global')
    const parsed = JSON.parse(body)
    assert.equal(parsed.to, 'user@example.com')
    assert.equal(parsed.subject, 'Test global')
  } finally { await server.close() }
})
