import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('sends.send sets Idempotency-Key and omits undefined fields', async () => {
  let receivedBody = '';
  let idemp = undefined;
  let version = undefined;
  const server = await startTestServer({
    'POST /sends': async (req, res, url) => {
      idemp = req.headers['idempotency-key'];
      version = req.headers['fluxomail-version'];
      for await (const chunk of req) receivedBody += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ sendId: 'send_test', accepted: true }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, version: '2025-09-01' });
    const res = await fm.sends.send({ to: 'user@example.com', subject: 'Hi', text: 'Hello', idempotencyKey: 'idem-1' });
    assert.equal(res.sendId, 'send_test');
    assert.equal(idemp, 'idem-1');
    assert.equal(version, '2025-09-01');
    // Ensure no 'from' field if omitted
    const parsed = JSON.parse(receivedBody || '{}');
    assert.ok(!('from' in parsed));
  } finally {
    await server.close();
  }
});

