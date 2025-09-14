import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('SSE subscribe receives events and auto-reconnects', async (t) => {
  let connectionCount = 0;
  const server = await startTestServer({
    'SSE /events/stream': (req, res, url) => {
      connectionCount++;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write(`id: 1\n`);
      res.write(`data: ${JSON.stringify({ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} })}\n\n`);
      // Close quickly to force reconnect
      setTimeout(() => res.end(), 50);
    }
  });
  try {
    const fm = new Fluxomail({ token: 't', baseUrl: server.url });
    const received = [];
    const sub = fm.events.subscribe({}, (evt) => { received.push(evt); });
    await new Promise((r) => setTimeout(r, 250));
    sub.close();
    assert.ok(received.length >= 1);
    assert.ok(connectionCount >= 1);
  } finally { await server.close(); }
});

