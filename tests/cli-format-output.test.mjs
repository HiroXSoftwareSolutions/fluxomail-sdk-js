import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startTestServer } from './helpers/server.mjs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFile, rm } from 'node:fs/promises';

test('CLI events list supports jsonl and output file', async () => {
  let called = 0;
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      called++;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [
        { id: 'e1', type: 'email.delivered', created: new Date().toISOString(), data: {} },
        { id: 'e2', type: 'email.opened', created: new Date().toISOString(), data: {} },
      ], nextCursor: null }));
    }
  });
  const outPath = path.join(tmpdir(), `fluxo_cli_${Date.now()}.jsonl`);
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const args = ['bin/fluxomail.mjs', 'events', 'list', '--format', 'jsonl', '--output', outPath];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    await new Promise((r) => child.on('close', r));
    const text = await readFile(outPath, 'utf8');
    const lines = text.trim().split('\n');
    assert.equal(lines.length, 2);
    const first = JSON.parse(lines[0]);
    assert.equal(first.id, 'e1');
  } finally { await rm(outPath, { force: true }); await server.close(); }
});

test('CLI uses token-cmd when no apiKey is provided', async () => {
  let seenToken = '';
  const server = await startTestServer({
    'GET /events': (req, res, url) => {
      // token-cmd is used by SDK for initial token, but this endpoint doesn't check it.
      seenToken = 'ok';
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ events: [], nextCursor: null }));
    }
  });
  try {
    const env = { ...process.env, FLUXOMAIL_BASE_URL: server.url };
    const args = ['bin/fluxomail.mjs', 'events', 'list', '--limit', '1', '--token-cmd', 'printf token-123'];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    let out = '';
    for await (const chunk of child.stdout) out += String(chunk);
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 0);
    assert.ok(out.includes('events'));
    assert.equal(seenToken, 'ok');
  } finally { await server.close(); }
});

