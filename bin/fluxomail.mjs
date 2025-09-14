#!/usr/bin/env node
// Fluxomail CLI: send, events list, events tail (SSE)
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function loadSdk() {
  const url = new URL('../dist/index.js', import.meta.url).href;
  return await import(url);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      const val = v !== undefined ? v : (argv[i + 1]?.startsWith('--') ? true : argv[++i]);
      if (args[k] === undefined) args[k] = val;
      else if (Array.isArray(args[k])) args[k].push(val);
      else args[k] = [args[k], val];
    } else {
      args._.push(a);
    }
  }
  return args;
}

function usage() {
  console.log(`
fluxomail <command> [options]

Commands:
  send            Send an email
  events list     List events (backfill)
  events tail     Stream events (SSE)

Global options:
  --api-key <key>           API key (or env FLUXOMAIL_API_KEY)
  --base <url>              API base URL (default https://api.fluxomail.com/api/v1)
  --version <date>          API version header (default 2025-09-01)

Send options:
  --to <email>[,email]      Recipient(s)
  --from <email>            Sender (optional; server default used if omitted)
  --subject <text>
  --text <text>
  --html <html>
  --idempotency <key>
  --cc <email[,email]>
  --bcc <email[,email]>
  --attach <path[:mime][:name]>   (repeat to add multiple)

Events list options:
  --types <csv>             e.g., email.delivered,email.opened or email.*
  --limit <n>
  --since <ts|ISO>
  --cursor <cursor>

Events tail options:
  --types <csv>
  --since <ts|ISO>
`);
}

async function main() {
  const [, , ...argv] = process.argv;
  if (argv.length === 0) { usage(); process.exit(1); }
  if (argv.includes('--help') || argv.includes('-h')) { usage(); process.exit(0); }
  const args = parseArgs(argv);
  const cmd = args._[0];
  const sub = args._[1];

  const apiKey = args['api-key'] || process.env.FLUXOMAIL_API_KEY || '';
  const baseUrl = args.base || process.env.FLUXOMAIL_BASE_URL || undefined;
  const version = args.version || '2025-09-01';

  const { Fluxomail } = await loadSdk();
  const fm = new Fluxomail({ apiKey, baseUrl, version });

  if (cmd === 'send') {
    const to = String(args.to || '');
    const subject = String(args.subject || '');
    const text = args.text ? String(args.text) : undefined;
    const html = args.html ? String(args.html) : undefined;
    const idemp = args.idempotency ? String(args.idempotency) : undefined;
    if (!apiKey) { console.error('Missing --api-key or FLUXOMAIL_API_KEY'); process.exit(2); }
    if (!to || !subject || (!text && !html)) { console.error('send requires --to, --subject and one of --text/--html'); process.exit(2); }
    const toList = to.includes(',') ? to.split(',').map(s=>s.trim()).filter(Boolean) : to;
    // cc/bcc parsing
    const cc = args.cc ? String(args.cc).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const bcc = args.bcc ? String(args.bcc).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    // attachments parsing (repeatable flag)
    const attachArgs = args.attach ? (Array.isArray(args.attach) ? args.attach : [args.attach]) : [];
    const attachments = [];
    for (const spec of attachArgs) {
      const s = String(spec);
      const parts = s.split(':');
      const p = parts[0];
      const mime = parts[1] || undefined;
      const name = parts[2] || path.basename(p);
      const buf = await readFile(p);
      attachments.push({ filename: name, content: new Uint8Array(buf), ...(mime ? { contentType: mime } : {}) });
    }
    const res = await fm.sends.send({ to: toList, from: args.from, subject, text, html, cc, bcc, attachments: attachments.length ? attachments : undefined, idempotencyKey: idemp });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === 'events' && sub === 'list') {
    if (!apiKey) { console.error('Missing --api-key or FLUXOMAIL_API_KEY'); process.exit(2); }
    const types = args.types ? String(args.types).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const limit = args.limit ? Number(args.limit) : undefined;
    const since = args.since ? String(args.since) : undefined;
    const cursor = args.cursor ? String(args.cursor) : undefined;
    const res = await fm.events.list({ types, limit, since, cursor });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === 'events' && sub === 'tail') {
    if (!apiKey) { console.error('Missing --api-key or FLUXOMAIL_API_KEY'); process.exit(2); }
    const types = args.types ? String(args.types).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const since = args.since ? String(args.since) : undefined;
    const subsc = fm.events.subscribe({ types, since }, (evt) => {
      console.log(JSON.stringify(evt));
    });
    process.on('SIGINT', () => { subsc.close(); process.exit(0); });
    return;
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
