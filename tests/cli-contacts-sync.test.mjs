import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startTestServer } from './helpers/server.mjs';

test('CLI contacts sync sends payload file and idempotency key', async () => {
  let lastIdempotency = '';
  let body = '';
  const server = await startTestServer({
    'POST /contacts/sync': async (req, res) => {
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
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'fluxomail-cli-'));
    const payloadPath = path.join(tmpDir, 'contacts.json');
    await writeFile(payloadPath, JSON.stringify({
      source: 'stripe',
      contacts: [
        { email: 'user@example.com', externalId: 'cus_123', eventId: 'evt_1' },
      ],
    }), 'utf8');

    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const args = ['bin/fluxomail.mjs', 'contacts', 'sync', '--file', payloadPath, '--idempotency', 'contacts-1'];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    let out = '';
    for await (const chunk of child.stdout) out += chunk;
    const code = await new Promise((r) => child.on('close', r));

    assert.equal(code, 0);
    assert.equal(lastIdempotency, 'contacts-1');
    const result = JSON.parse(out);
    assert.equal(result.ok, true);
    const parsed = JSON.parse(body || '{}');
    assert.equal(parsed.source, 'stripe');
    assert.equal(parsed.contacts.length, 1);
    assert.equal(parsed.contacts[0].externalId, 'cus_123');
  } finally {
    await server.close();
  }
});

test('CLI contacts sync requires idempotency key or eventId per row', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'fluxomail-cli-'));
  const payloadPath = path.join(tmpDir, 'contacts-missing-event.json');
  await writeFile(payloadPath, JSON.stringify({
    contacts: [
      { email: 'user@example.com', externalId: 'cus_123' },
    ],
  }), 'utf8');

  const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: 'http://127.0.0.1:9' };
  const args = ['bin/fluxomail.mjs', 'contacts', 'sync', '--file', payloadPath];
  const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
  let errOut = '';
  for await (const chunk of child.stderr) errOut += chunk;
  const code = await new Promise((r) => child.on('close', r));

  assert.equal(code, 2);
  assert.ok(errOut.includes('requires --idempotency or eventId on every contact row'));
});

test('CLI contacts sync retries transient failures', async () => {
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
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'fluxomail-cli-'));
    const payloadPath = path.join(tmpDir, 'contacts-retry.json');
    await writeFile(payloadPath, JSON.stringify({
      source: 'stripe',
      contacts: [{ email: 'retry@example.com', externalId: 'cus_retry' }],
    }), 'utf8');

    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const args = [
      'bin/fluxomail.mjs',
      'contacts',
      'sync',
      '--file',
      payloadPath,
      '--idempotency',
      'contacts-retry',
      '--idempotent-retry',
      '2',
    ];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    const code = await new Promise((r) => child.on('close', r));

    assert.equal(code, 0);
    assert.equal(attempts, 2);
  } finally {
    await server.close();
  }
});
