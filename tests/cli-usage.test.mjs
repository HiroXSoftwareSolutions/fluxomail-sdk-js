import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('CLI shows usage and exits 1 when no args', async () => {
  const child = spawn(process.execPath, ['bin/fluxomail.mjs'], { cwd: new URL('..', import.meta.url).pathname });
  let errOut = '';
  let out = '';
  for await (const chunk of child.stdout) out += chunk;
  for await (const chunk of child.stderr) errOut += chunk;
  const code = await new Promise((r) => child.on('close', r));
  assert.equal(code, 1);
  assert.ok(out.includes('fluxomail <command>'));
});

test('CLI send exits 2 when missing required flags', async () => {
  // Missing API key and required flags should exit 2
  const env = { ...process.env }; delete env.FLUXOMAIL_API_KEY; delete env.FLUXOMAIL_BASE_URL;
  const args = ['bin/fluxomail.mjs', 'send', '--to', 'u@example.com'];
  const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
  const code = await new Promise((r) => child.on('close', r));
  assert.equal(code, 2);
});

