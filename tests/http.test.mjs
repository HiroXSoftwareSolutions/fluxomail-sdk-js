import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('HttpClient sets headers and retries GET on 500', async () => {
  let attempts = 0;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      attempts++;
      if (attempts < 2) {
        res.statusCode = 500; res.end(JSON.stringify({ error: 'temporary' })); return;
      }
      const ua = req.headers['user-agent'] || '';
      const version = req.headers['fluxomail-version'];
      assert.ok(String(ua).includes('fluxomail-sdk-js/'));
      assert.equal(version, '2025-09-01');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Fluxomail-Request-Id', 'req_test');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k_test', baseUrl: server.url, version: '2025-09-01' });
    const out = await fm.events.list({ limit: 1 });
    assert.deepEqual(out, { events: [], nextCursor: null });
    assert.equal(attempts, 2);
  } finally { await server.close(); }
});

