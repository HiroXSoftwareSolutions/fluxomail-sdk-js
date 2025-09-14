import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('events.iterate pages through results respecting nextCursor', async () => {
  const pages = [
    { events: [{ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} }], nextCursor: 'c2' },
    { events: [{ id: '2', type: 'email.opened', created: new Date().toISOString(), data: {} }], nextCursor: null },
  ];
  let call = 0;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      const body = pages[call++] || { events: [], nextCursor: null };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    const received = [];
    for await (const ev of fm.events.iterate({ limit: 1 })) received.push(ev.id);
    assert.deepEqual(received, ['1', '2']);
  } finally { await server.close(); }
});

