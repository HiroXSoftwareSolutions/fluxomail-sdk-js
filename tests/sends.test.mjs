import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('sends.send maps to v1 body and sets Idempotency-Key', async () => {
  let receivedBody = '';
  let idemp = undefined;
  let version = undefined;
  const server = await startTestServer({
    'POST /emails/send': async (req, res, url) => {
      idemp = req.headers['idempotency-key'];
      version = req.headers['fluxomail-version'];
      for await (const chunk of req) receivedBody += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ sendId: 'send_test', accepted: true }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url, version: '2025-09-01' });
    const res = await fm.sends.send({ to: 'user@example.com', subject: 'Hi', text: 'Hello', from: 'Name <from@example.com>', replyTo: 'reply@example.com', cc: ['c1@example.com'], bcc: 'b1@example.com', attachments: [{ filename: 'a.txt', content: 'abc', contentType: 'text/plain' }], idempotencyKey: 'idem-1' });
    assert.equal(res.sendId, 'send_test');
    assert.equal(idemp, 'idem-1');
    assert.equal(version, '2025-09-01');
    // Ensure v1 fields present and legacy mapping applied
    const parsed = JSON.parse(receivedBody || '{}');
    assert.equal(parsed.subject, 'Hi');
    assert.equal(parsed.content, 'Hello');
    assert.ok(!('text' in parsed));
    assert.equal(parsed.fromEmail, 'from@example.com');
    assert.equal(parsed.fromName, 'Name');
    assert.equal(parsed.replyTo, 'reply@example.com');
    assert.deepEqual(parsed.cc, ['c1@example.com']);
    assert.equal(parsed.bcc, 'b1@example.com');
    assert.ok(Array.isArray(parsed.attachments));
    assert.equal(parsed.attachments[0].filename, 'a.txt');
    assert.equal(parsed.attachments[0].contentType, 'text/plain');
    assert.ok(typeof parsed.attachments[0].contentBase64 === 'string');
  } finally {
    await server.close();
  }
});

test('sends.send retries on 500 when idempotencyKey and idempotentRetry set', async () => {
  let attempts = 0;
  const server = await startTestServer({
    'POST /emails/send': async (req, res, url) => {
      attempts++;
      if (attempts < 2) { res.statusCode = 500; res.end(JSON.stringify({ code: 'server_error' })); return; }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ sendId: 'send_retry', accepted: true }));
    }
  });
  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    const out = await fm.sends.send({ to: 'u@example.com', subject: 'Hi', content: 'T', idempotencyKey: 'idem', idempotentRetry: 2 });
    assert.equal(out.sendId, 'send_retry');
    assert.equal(attempts, 2);
  } finally { await server.close(); }
});
