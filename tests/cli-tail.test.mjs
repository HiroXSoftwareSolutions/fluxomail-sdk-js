import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startTestServer } from './helpers/server.mjs';

test('CLI events tail streams SSE and exits on SIGINT', async () => {
  const server = await startTestServer({
    'SSE /events/stream': (req, res, url) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      // Emit a couple of events
      res.write(`id: 1\n`);
      res.write(`data: ${JSON.stringify({ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} })}\n\n`);
      setTimeout(() => {
        res.write(`id: 2\n`);
        res.write(`data: ${JSON.stringify({ id: '2', type: 'email.opened', created: new Date().toISOString(), data: {} })}\n\n`);
      }, 50);
    },
  });
  try {
    const env = { ...process.env, FLUXOMAIL_API_KEY: 'k', FLUXOMAIL_BASE_URL: server.url };
    const args = ['bin/fluxomail.mjs', 'events', 'tail', '--types', 'email.*'];
    const child = spawn(process.execPath, args, { env, cwd: new URL('..', import.meta.url).pathname });
    let lines = 0;
    for await (const chunk of child.stdout) {
      const text = chunk.toString('utf8');
      lines += text.split('\n').filter(Boolean).length;
      if (lines >= 1) {
        child.kill('SIGINT');
      }
    }
    const code = await new Promise((r) => child.on('close', r));
    assert.equal(code, 0);
    assert.ok(lines >= 1);
  } finally {
    await server.close();
  }
});

