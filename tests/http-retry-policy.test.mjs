import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('Retry policy respects custom maxAttempts and 408 status', async () => {
  let attempts = 0;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      attempts++;
      if (attempts < 3) { res.statusCode = 408; res.end('timeout'); return; }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, retry: { maxAttempts: 3, retriableStatuses: [408, 429], baseDelayMs: 1, maxDelayMs: 2 } });
    const out = await fm.events.list({ limit: 1 });
    assert.deepEqual(out, { events: [], nextCursor: null });
    assert.equal(attempts, 3);
  } finally { await server.close(); }
});

