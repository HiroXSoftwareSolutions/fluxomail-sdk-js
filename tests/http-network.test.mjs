import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail, NetworkError } from '../dist/index.js';

test('HttpClient throws NetworkError on connect failure after retries', async () => {
  // Use an unroutable or refused port to force network error
  const baseUrl = 'http://127.0.0.1:65535';
  const fm = new Fluxomail({ apiKey: 'k', baseUrl, timeoutMs: 100 });
  await assert.rejects(() => fm.events.list({ limit: 1 }), (e) => {
    assert.ok(e instanceof NetworkError);
    return true;
  });
});
