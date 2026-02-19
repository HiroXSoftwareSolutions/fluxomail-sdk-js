import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('events.list passes filter params (smtpCode, mtaHost, domain)', async () => {
  let lastQuery = ''
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      lastQuery = url.search
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ events: [], nextCursor: null }))
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url })
    await fm.events.list({
      types: ['email.delivered'],
      smtpCode: '250',
      mtaHost: 'mx.google.com',
      domain: 'gmail.com',
    })
    assert.ok(lastQuery.includes('smtpCode=250'))
    assert.ok(lastQuery.includes('mtaHost=mx.google.com'))
    assert.ok(lastQuery.includes('domain=gmail.com'))
  } finally { await server.close() }
})
