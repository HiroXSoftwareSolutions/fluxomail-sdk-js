import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { startTestServer } from './helpers/server.mjs'

test('CLI whoami validates auth via events list', async () => {
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ events: [], nextCursor: null }))
    }
  })
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url }
    const child = spawn(process.execPath, ['bin/fluxomail.mjs', 'whoami'], { env, cwd: new URL('..', import.meta.url).pathname })
    let out = ''
    for await (const chunk of child.stdout) out += chunk
    const code = await new Promise((r) => child.on('close', r))
    assert.equal(code, 0)
    assert.ok(out.includes('ok'))
  } finally { await server.close() }
})

