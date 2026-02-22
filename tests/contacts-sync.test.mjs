import test from 'node:test';
import assert from 'node:assert/strict';
import { Fluxomail } from '../dist/index.js';
import { startTestServer } from './helpers/server.mjs';

test('contacts.sync calls /contacts/sync with idempotency key', async () => {
  let lastPath = '';
  let lastIdempotency = '';
  let body = '';
  const server = await startTestServer({
    'POST /contacts/sync': async (req, res, url) => {
      lastPath = url.pathname;
      lastIdempotency = String(req.headers['idempotency-key'] || '');
      for await (const chunk of req) body += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        ok: true,
        source: 'stripe',
        processed: 1,
        created: 1,
        updated: 0,
        failed: 0,
        skippedStale: 0,
        skippedDuplicate: 0,
        unsubscribed: 0,
        resubscribed: 0,
      }));
    },
  });

  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    const result = await fm.contacts.sync({
      source: 'stripe',
      idempotencyKey: 'contacts-1',
      contacts: [
        {
          email: 'user@example.com',
          externalId: 'cus_123',
          subscribed: true,
          metadata: { mrr: 79 },
          sourceUpdatedAt: '2026-02-20T12:00:00Z',
        },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.processed, 1);
    assert.equal(lastPath, '/contacts/sync');
    assert.equal(lastIdempotency, 'contacts-1');
    const parsed = JSON.parse(body || '{}');
    assert.equal(parsed.source, 'stripe');
    assert.equal(parsed.contacts.length, 1);
    assert.equal(parsed.contacts[0].email, 'user@example.com');
  } finally {
    await server.close();
  }
});

test('contacts.sync retries transient failures when idempotency is enabled', async () => {
  let attempts = 0;
  const server = await startTestServer({
    'POST /contacts/sync': async (_req, res) => {
      attempts += 1;
      if (attempts === 1) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 'internal_error', message: 'temporary failure' }));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        ok: true,
        source: 'stripe',
        processed: 1,
        created: 1,
        updated: 0,
        failed: 0,
        skippedStale: 0,
        skippedDuplicate: 0,
        unsubscribed: 0,
        resubscribed: 0,
      }));
    },
  });

  try {
    const fm = new Fluxomail({ apiKey: 'k', baseUrl: server.url });
    const result = await fm.contacts.sync({
      source: 'stripe',
      idempotencyKey: 'contacts-retry-1',
      idempotentRetry: 2,
      contacts: [{ email: 'retry@example.com', externalId: 'cus_retry' }],
    });
    assert.equal(result.ok, true);
    assert.equal(attempts, 2);
  } finally {
    await server.close();
  }
});
