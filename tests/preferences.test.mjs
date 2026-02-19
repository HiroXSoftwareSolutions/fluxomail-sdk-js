import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('preferences.get passes token and email as query params', async () => {
  let lastQuery = ''
  const server = await startTestServer({
    'GET /preferences': (req, res, url) => {
      lastQuery = url.search
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        contact: { id: 'c1', email: 'a@b.com' },
        categories: [{ key: 'marketing', name: 'Marketing' }],
        subscriptions: [{ categoryKey: 'marketing', subscribed: true }],
      }))
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url })
    const res = await fm.preferences.get({ token: 'tok_abc', email: 'a@b.com' })
    assert.equal(res.contact.id, 'c1')
    assert.ok(lastQuery.includes('token=tok_abc'))
    assert.ok(lastQuery.includes('email=a%40b.com'))
    assert.equal(res.categories.length, 1)
    assert.equal(res.subscriptions.length, 1)
  } finally { await server.close() }
})

test('preferences.update sends subscriptions in body', async () => {
  let body = ''
  const server = await startTestServer({
    'POST /preferences': async (req, res) => {
      for await (const c of req) body += c
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true }))
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url })
    const res = await fm.preferences.update({
      email: 'a@b.com',
      subscriptions: [
        { categoryKey: 'marketing', subscribed: false },
        { categoryKey: 'transactional', subscribed: true },
      ],
    })
    assert.equal(res.ok, true)
    const parsed = JSON.parse(body)
    assert.equal(parsed.email, 'a@b.com')
    assert.equal(parsed.subscriptions.length, 2)
    assert.equal(parsed.subscriptions[0].categoryKey, 'marketing')
    assert.equal(parsed.subscriptions[0].subscribed, false)
  } finally { await server.close() }
})
