import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startTestServer } from './helpers/server.mjs';

test('CLI metrics get prints JSON', async () => {
  const payload = {
    window: { preset: '7d', since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), until: new Date().toISOString() },
    scanned: { sends: 3, sendScanLimit: 1000 },
    metrics: { totalSent: 3, totalDelivered: 3, deliveryRate: 100 },
  };
  const server = await startTestServer({
    'GET /metrics': (_req, res, _url) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
  });
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const child = spawn(
      process.execPath,
      ['bin/fluxomail.mjs', 'metrics', 'get', '--window', '7d', '--format', 'json'],
      { env, cwd: new URL('..', import.meta.url).pathname },
    );
    let out = '';
    for await (const chunk of child.stdout) out += chunk;
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 0);
    const parsed = JSON.parse(out);
    assert.equal(parsed.metrics.totalSent, 3);
  } finally {
    await server.close();
  }
});
