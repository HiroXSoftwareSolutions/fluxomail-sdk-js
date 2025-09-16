import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'
import { startTestServer } from './helpers/server.mjs'

test('templates CRUD and render map endpoints correctly', async () => {
  let createBody = ''
  let updateBody = ''
  let renderBody = ''
  let lastPath = ''
  let listQuery = ''
  const server = await startTestServer({
    'POST /templates': async (req, res, url) => {
      lastPath = url.pathname
      for await (const c of req) createBody += c
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ id: 'tmpl_1', name: 'Welcome' }))
    },
    'GET /templates': (req, res, url) => {
      listQuery = url.search
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ templates: [{ id: 'tmpl_1' }], nextCursor: null }))
    },
    'GET /templates/tmpl_1': (req, res, url) => {
      lastPath = url.pathname
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ id: 'tmpl_1', name: 'Welcome' }))
    },
    'PUT /templates/tmpl_1': async (req, res, url) => {
      lastPath = url.pathname
      for await (const c of req) updateBody += c
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ id: 'tmpl_1', name: 'Welcome', subject: 'Hi' }))
    },
    'DELETE /templates/tmpl_1': (req, res, url) => {
      lastPath = url.pathname
      res.statusCode = 204
      res.end()
    },
    'POST /templates/tmpl_1/render': async (req, res, url) => {
      lastPath = url.pathname
      for await (const c of req) renderBody += c
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ subject: 'Hi Pat', html: '<h1>Hi Pat</h1>' }))
    }
  })
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url })
    const t = await fm.templates.create({ name: 'Welcome' })
    assert.equal(t.id, 'tmpl_1')
    assert.equal(lastPath, '/templates')
    assert.ok(createBody.includes('Welcome'))

    const list = await fm.templates.list({ limit: 10 })
    assert.ok(Array.isArray(list.templates))
    assert.ok(listQuery.includes('limit=10'))

    const g = await fm.templates.get('tmpl_1')
    assert.equal(g.id, 'tmpl_1')
    assert.equal(lastPath, '/templates/tmpl_1')

    const u = await fm.templates.update('tmpl_1', { subject: 'Hi' })
    assert.equal(u.subject, 'Hi')
    assert.ok(updateBody.includes('Hi'))

    const r = await fm.templates.render('tmpl_1', { variables: { name: 'Pat' } })
    assert.equal(r.subject, 'Hi Pat')
    assert.ok(renderBody.includes('name'))

    const d = await fm.templates.delete('tmpl_1')
    assert.ok(d.deleted)
    assert.equal(lastPath, '/templates/tmpl_1')
  } finally { await server.close() }
})

