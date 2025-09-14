import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('timelines.get hits /timelines/:id with query', async () => {
  let path = '';
  let query = '';
  const server = await startTestServer({
    'GET /timelines/send_abc': (req, res, url) => {
      path = url.pathname;
      query = url.search;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({ token: 't', baseUrl: server.url });
    const out = await fm.timelines.get({ sendId: 'send_abc', cursor: 'c1', limit: 10 });
    assert.deepEqual(out, { events: [], nextCursor: null });
    assert.equal(path, '/timelines/send_abc');
    assert.ok(query.includes('cursor=c1'));
    assert.ok(query.includes('limit=10'));
  } finally {
    await server.close();
  }
});

