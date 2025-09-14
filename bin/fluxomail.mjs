#!/usr/bin/env node
// Minimal Fluxomail CLI: send, events list, events tail (SSE)
import process from 'node:process';

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
      if (v !== undefined) args[k] = v;
      else args[k] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
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
  --base <url>              API base URL (default https://api.fluxomail.com)
  --version <date>          API version header (default 2025-09-01)

Send options:
  --to <email>[,email]      Recipient(s)
  --from <email>            Sender (optional; server default used if omitted)
  --subject <text>
  --text <text>
  --html <html>
  --idempotency <key>

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
    const res = await fm.sends.send({ to: toList, from: args.from, subject, text, html, idempotencyKey: idemp });
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

