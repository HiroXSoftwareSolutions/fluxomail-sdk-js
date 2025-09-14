import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('buildQuery encodes array params (types) correctly', async () => {
  let query = '';
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      query = url.search;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    await fm.events.list({ types: ['email.delivered', 'email.opened'] });
    assert.ok(query.includes('types=email.delivered'));
    assert.ok(query.includes('types=email.opened'));
  } finally { await server.close(); }
});

