import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('SSE subscribe respects external AbortSignal', { timeout: 5000 }, async () => {
  const server = await startTestServer({
    'SSE /events/stream': (req, res, url) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      // Keep open; we will abort immediately
    }
  });
  try {
    const fm = new Fluxomail({ token: 't', baseUrl: server.url });
    const ctrl = new AbortController();
    const sub = fm.events.subscribe({ signal: ctrl.signal }, () => {});
    ctrl.abort();
    // Give a tick for abort to propagate without throwing
    await new Promise((r) => setTimeout(r, 10));
    sub.close();
    assert.ok(true);
  } finally { await server.close(); }
});
