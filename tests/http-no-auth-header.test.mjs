import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('no Authorization header when no apiKey/token provided', async () => {
  let auth;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      auth = req.headers['authorization'];
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({ baseUrl: server.url });
    await fm.events.list({ limit: 1 });
    assert.equal(auth, undefined);
  } finally { await server.close(); }
});

