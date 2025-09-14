import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('CLI unknown command shows usage and exits 1', async () => {
  const child = spawn(process.execPath, ['bin/fluxomail.mjs', 'unknown', 'cmd'], { cwd: new URL('..', import.meta.url).pathname });
  let out = '';
  for await (const chunk of child.stdout) out += chunk;
  const code = await new Promise((r) => child.on('close', r));
  assert.equal(code, 1);
  assert.ok(out.includes('fluxomail <command>'));
});

