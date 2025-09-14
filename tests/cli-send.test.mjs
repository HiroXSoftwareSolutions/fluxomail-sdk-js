import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startTestServer } from './helpers/server.mjs';

test('CLI send prints JSON and passes idempotency', async () => {
  let receivedIdemp = undefined;
  let body = '';
  const server = await startTestServer({
    'POST /sends': async (req, res, url) => {
      receivedIdemp = req.headers['idempotency-key'];
      for await (const chunk of req) body += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ sendId: 'send_cli', accepted: true }));
    }
  });
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const args = ['bin/fluxomail.mjs', 'send', '--to', 'u@example.com', '--subject', 'Hi', '--text', 'Hello', '--idempotency', 'ci-1'];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    let out = '';
    for await (const chunk of child.stdout) out += chunk;
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 0);
    const parsed = JSON.parse(out);
    assert.equal(parsed.sendId, 'send_cli');
    assert.equal(receivedIdemp, 'ci-1');
    const parsedBody = JSON.parse(body || '{}');
    assert.equal(parsedBody.subject, 'Hi');
    assert.equal(parsedBody.text, 'Hello');
  } finally {
    await server.close();
  }
});

