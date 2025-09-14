import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail, RateLimitError } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('HttpClient surfaces RateLimitError with retryAfterMs from header', async () => {
  let attempts = 0;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      attempts++;
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Retry-After', '1');
      res.end(JSON.stringify({ code: 'rate_limited', message: 'Too many' }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, timeoutMs: 1000 });
    await assert.rejects(() => fm.events.list({ limit: 1 }), (e) => {
      assert.ok(e instanceof RateLimitError);
      assert.equal(e.retryAfterMs, 1000);
      return true;
    });
    assert.ok(attempts >= 1);
  } finally {
    await server.close();
  }
});

