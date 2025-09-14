import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startTestServer } from './helpers/server.mjs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeFile, rm } from 'node:fs/promises';

test('CLI send supports cc/bcc/attachments', async () => {
  const tmp = path.join(tmpdir(), `fluxo_cli_${Date.now()}.txt`);
  await writeFile(tmp, 'foobar', 'utf8');
  let body = '';
  const server = await startTestServer({
    'POST /emails/send': async (req, res, url) => {
      for await (const chunk of req) body += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ sendId: 'send_cli_attach', accepted: true }));
    }
  });
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const args = ['bin/fluxomail.mjs', 'send', '--to', 'u@example.com', '--subject', 'Hi', '--text', 'Hello', '--cc', 'c1@example.com', '--bcc', 'b1@example.com', '--attach', `${tmp}:text/plain:file.txt`];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    let out = '';
    for await (const chunk of child.stdout) out += chunk;
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 0);
    const parsedBody = JSON.parse(body || '{}');
    assert.deepEqual(parsedBody.cc, ['c1@example.com']);
    const b = parsedBody.bcc;
    if (Array.isArray(b)) assert.deepEqual(b, ['b1@example.com']);
    else assert.equal(b, 'b1@example.com');
    assert.ok(Array.isArray(parsedBody.attachments));
    assert.equal(parsedBody.attachments[0].filename, 'file.txt');
    assert.equal(parsedBody.attachments[0].contentType, 'text/plain');
    assert.equal(parsedBody.attachments[0].contentBase64, Buffer.from('foobar').toString('base64'));
  } finally {
    await rm(tmp, { force: true });
    await server.close();
  }
});
