import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';
import pkg from '../package.json' assert { type: 'json' };

test('User-Agent includes dynamic SDK version', async () => {
  let ua = '';
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      ua = String(req.headers['user-agent'] || '');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    await fm.events.list({ limit: 1 });
    assert.ok(ua.includes(`fluxomail-sdk-js/${pkg.version}`));
  } finally {
    await server.close();
  }
});

