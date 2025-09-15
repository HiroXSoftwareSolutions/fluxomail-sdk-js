import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail, NetworkError, TimeoutError } from '../dist/index.js';

test('HttpClient throws NetworkError on connect failure after retries', async () => {
  // Use an unroutable or refused port to force network error
  const baseUrl = 'http://127.0.0.1:65535';
  const fm = new Fluxomail({ apiKey: 'k', baseUrl, timeoutMs: 100 });
  await assert.rejects(() => fm.events.list({ limit: 1 }), (e) => {
    // Depending on platform timing, this may manifest as a NetworkError (ECONNREFUSED)
    // or a TimeoutError if the connection stalls before abort.
    assert.ok(e instanceof NetworkError || e instanceof TimeoutError);
    return true;
  });
});
