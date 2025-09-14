import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail, TimeoutError } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('HttpClient times out and throws TimeoutError', async () => {
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      // Intentionally never end the response to trigger timeout
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, timeoutMs: 50 });
    let threw = false;
    try {
      await fm.events.list({ limit: 1 });
    } catch (e) {
      threw = true;
      assert.ok(e instanceof TimeoutError);
    }
    assert.ok(threw);
  } finally {
    await server.close();
  }
});

