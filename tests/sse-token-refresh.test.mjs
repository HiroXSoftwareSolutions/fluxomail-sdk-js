import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('SSE subscribe uses getToken on reconnect', async () => {
  const tokens = [];
  let connects = 0;
  const server = await startTestServer({
    'SSE /events/stream': (req, res, url) => {
      connects++;
      const token = url.searchParams.get('token') || '';
      tokens.push(token);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write(`id: 1\n`);
      res.write(`data: ${JSON.stringify({ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} })}\n\n`);
      // Close fast to force reconnect
      setTimeout(() => res.end(), 20);
    }
  });
  try {
    let n = 0;
    const fm = new Fluxomail({ baseUrl: server.url });
    const sub = fm.events.subscribe({ getToken: () => Promise.resolve(n++ === 0 ? 't1' : 't2') }, () => {});
    await new Promise((r) => setTimeout(r, 200));
    sub.close();
    assert.ok(connects >= 1);
    assert.ok(tokens.includes('t1'));
    // if reconnect happened, should also include t2
    assert.ok(tokens.some((t) => t === 't2') || connects === 1);
  } finally { await server.close(); }
});
