import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startTestServer } from './helpers/server.mjs';

test('CLI events list prints JSON', async () => {
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [{ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} }], nextCursor: null }));
    }
  });
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const child = spawn(process.execPath, ['bin/fluxomail.mjs', 'events', 'list', '--limit', '1'], { env, cwd: new URL('..', import.meta.url).pathname });
    let out = '';
    for await (const chunk of child.stdout) out += chunk;
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 0);
    const parsed = JSON.parse(out);
    assert.ok(Array.isArray(parsed.events));
  } finally { await server.close(); }
});

