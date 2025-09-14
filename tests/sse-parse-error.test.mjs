import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('SSE subscribe ignores parse errors', async () => {
  const server = await startTestServer({
    'SSE /events/stream': (req, res, url) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write('data: not-json\n\n');
      setTimeout(() => res.end(), 10);
    },
  });
  try {
    const fm = new Fluxomail({ token: 't', baseUrl: server.url });
    let called = false;
    const sub = fm.events.subscribe({}, () => { called = true; });
    await new Promise((r) => setTimeout(r, 30));
    sub.close();
    assert.equal(called, false);
  } finally {
    await server.close();
  }
});

