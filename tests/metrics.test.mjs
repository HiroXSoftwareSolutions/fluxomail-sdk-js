import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('metrics.get returns aggregate metrics payload', async () => {
  const payload = {
    window: { preset: '7d', since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), until: new Date().toISOString() },
    scanned: { sends: 12, sendScanLimit: 1000 },
    metrics: { totalSent: 12, totalDelivered: 11, deliveryRate: 91.7 },
  };

  const server = await startTestServer({
    'GET /metrics': (_req, res, _url) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
  });

  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    const out = await fm.metrics.get({ window: '7d' });
    assert.equal(out.window.preset, '7d');
    assert.equal(out.scanned.sends, 12);
    assert.equal(out.metrics.totalSent, 12);
  } finally {
    await server.close();
  }
});
