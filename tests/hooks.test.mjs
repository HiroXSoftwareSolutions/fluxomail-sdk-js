import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('beforeRequest adds header and afterResponse observes status', async () => {
  let sawHeader = false;
  let observed = 0;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      if (req.headers['x-test'] === '1') sawHeader = true;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({
      apiKey: 'k', baseUrl: server.url,
      beforeRequest: ({ headers }) => { headers.set('X-Test', '1'); },
      afterResponse: ({ status }) => { observed = status; }
    });
    await fm.events.list({});
    assert.ok(sawHeader);
    assert.equal(observed, 200);
  } finally { await server.close(); }
});

