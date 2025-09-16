#!/usr/bin/env node
// Fluxomail CLI: send, events list, events tail (SSE)
import process from 'node:process';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { exec } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

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
  events backfill Backfill events and persist checkpoint
  timelines get   Get a send's timeline
  whoami          Validate auth and show account info (basic)
  init next       Scaffold Next.js token route example
  init worker     Scaffold minimal Cloudflare Worker example
  init next-app   Scaffold Next.js App Router token route

Global options:
  --api-key <key>           API key (or env FLUXOMAIL_API_KEY)
  --base <url>              API base URL (default https://api.fluxomail.com/api/v1)
  --version <date>          API version header (default 2025-09-01)
  --token-cmd <cmd>         Shell command that prints a short-lived token
  --quiet                   Suppress non-essential output
  --config <path>           Path to .fluxomailrc JSON (defaults: cwd then home)

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
  --header <k:v>            Add custom message header (repeat)

Events list options:
  --types <csv>             e.g., email.delivered,email.opened or email.*
  --limit <n>
  --since <ts|ISO>
  --cursor <cursor>
  --format <json|jsonl|pretty>
  --output <file>

Events tail options:
  --types <csv>
  --since <ts|ISO>
  --format <json|jsonl>
  --output <file>

Events backfill options:
  --types <csv>
  --limit <n>
  --since <eventId|ISO>     start position; overrides checkpoint
  --checkpoint-file <path>  file to persist last event id
  --format <json|jsonl>
  --output <file>
  --max-pages <n>

Timelines get options:
  --send-id <id>            required
  --limit <n>
  --cursor <cursor>
  --format <json|pretty>
  --output <file>
`);
}

function runTokenCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { env: process.env }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(String(stdout || '').trim());
    });
  });
}

async function main() {
  const [, , ...argv] = process.argv;
  if (argv.length === 0) { usage(); process.exit(1); }
  if (argv.includes('--help') || argv.includes('-h')) { usage(); process.exit(0); }
  const args = parseArgs(argv);
  const cmd = args._[0];
  const sub = args._[1];

  // Load config
  let cfg = {};
  const cfgPath = args.config ? String(args.config) : undefined;
  const cwdRc = path.join(process.cwd(), '.fluxomailrc');
  const homeRc = path.join(os.homedir(), '.fluxomailrc');
  const tryLoad = async (p) => { try { const t = await readFile(p, 'utf8'); return JSON.parse(t) } catch { return {} } };
  if (cfgPath) cfg = await tryLoad(cfgPath);
  else cfg = { ...(await tryLoad(cwdRc)), ...(await tryLoad(homeRc)) };

  const apiKey = args['api-key'] || process.env.FLUXOMAIL_API_KEY || cfg.apiKey || '';
  const baseUrl = args.base || process.env.FLUXOMAIL_BASE_URL || cfg.base || undefined;
  const version = args.version || cfg.version || '2025-09-01';

  const { Fluxomail } = await loadSdk();
  const tokenCmd = args['token-cmd'] ? String(args['token-cmd']) : (cfg['tokenCmd'] ? String(cfg['tokenCmd']) : undefined);
  let initialToken = undefined;
  if (!apiKey && tokenCmd) {
    try { initialToken = await runTokenCmd(tokenCmd); } catch {}
  }
  const fm = new Fluxomail({ apiKey, baseUrl, version, token: initialToken, getToken: tokenCmd ? () => runTokenCmd(tokenCmd) : undefined });

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
    // headers parsing
    const hdrs = args.header ? (Array.isArray(args.header) ? args.header : [args.header]) : [];
    const headers = {};
    for (const h of hdrs) {
      const s = String(h);
      const i = s.indexOf(':');
      if (i > 0) headers[s.slice(0, i).trim()] = s.slice(i + 1).trim();
    }
    const res = await fm.sends.send({ to: toList, from: args.from, subject, text, html, cc, bcc, headers: Object.keys(headers).length ? headers : undefined, attachments: attachments.length ? attachments : undefined, idempotencyKey: idemp });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === 'events' && sub === 'list') {
    if (!apiKey && !tokenCmd && !initialToken) { console.error('Missing auth: provide --api-key or --token-cmd'); process.exit(2); }
    const types = args.types ? String(args.types).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const limit = args.limit ? Number(args.limit) : undefined;
    const since = args.since ? String(args.since) : undefined;
    const cursor = args.cursor ? String(args.cursor) : undefined;
    const format = (args.format ? String(args.format) : 'pretty').toLowerCase();
    const outPath = args.output ? String(args.output) : undefined;
    const res = await fm.events.list({ types, limit, since, cursor });
    if (format === 'jsonl') {
      const lines = (res.events || []).map((e) => JSON.stringify(e)).join('\n') + '\n';
      if (!args.quiet) process.stdout.write(lines);
      if (outPath) await appendFile(outPath, lines);
    } else {
      const text = format === 'json' ? JSON.stringify(res) : JSON.stringify(res, null, 2);
      if (!args.quiet) console.log(text);
      if (outPath) await writeFile(outPath, text + '\n');
    }
    return;
  }

  if (cmd === 'events' && sub === 'tail') {
    if (!apiKey && !tokenCmd && !initialToken) { console.error('Missing auth: provide --api-key or --token-cmd'); process.exit(2); }
    const types = args.types ? String(args.types).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const since = args.since ? String(args.since) : undefined;
    const format = (args.format ? String(args.format) : 'jsonl').toLowerCase();
    const outPath = args.output ? String(args.output) : undefined;
    const subsc = fm.events.subscribe({ types, since }, async (evt) => {
      const line = format === 'json' ? JSON.stringify({ events: [evt] }) : JSON.stringify(evt);
      if (!args.quiet) console.log(line);
      if (outPath) { try { await appendFile(outPath, line + '\n'); } catch {} }
    });
    process.on('SIGINT', () => { subsc.close(); process.exit(0); });
    return;
  }

  if (cmd === 'events' && sub === 'backfill') {
    if (!apiKey && !tokenCmd && !initialToken) { console.error('Missing auth: provide --api-key or --token-cmd'); process.exit(2); }
    const types = args.types ? String(args.types).split(',').map(s=>s.trim()).filter(Boolean) : undefined;
    const limit = args.limit ? Number(args.limit) : undefined;
    const sinceArg = args.since ? String(args.since) : undefined;
    const ckptFile = args['checkpoint-file'] ? String(args['checkpoint-file']) : undefined;
    let since = sinceArg;
    if (!since && ckptFile) {
      try { since = String(await readFile(ckptFile, 'utf8')).trim() || undefined; } catch {}
    }
    const abort = new AbortController();
    process.on('SIGINT', () => { abort.abort(); });
    const format = (args.format ? String(args.format) : 'jsonl').toLowerCase();
    const outPath = args.output ? String(args.output) : undefined;
    let lastId = since;
    const maxPages = args['max-pages'] ? Number(args['max-pages']) : undefined;
    for await (const evt of fm.events.iterate({ types, limit, since, signal: abort.signal, maxPages })) {
      lastId = evt.id;
      const line = format === 'json' ? JSON.stringify({ events: [evt] }) : JSON.stringify(evt);
      if (!args.quiet) console.log(line);
      if (outPath) { try { await appendFile(outPath, line + '\n'); } catch {} }
      if (ckptFile && lastId) { try { await writeFile(ckptFile, lastId, 'utf8'); } catch {} }
    }
    return;
  }

  if (cmd === 'whoami') {
    if (!apiKey && !tokenCmd && !initialToken) { console.error('Missing auth: provide --api-key or --token-cmd'); process.exit(2); }
    try {
      const res = await fm.events.list({ limit: 0 });
      if (!args.quiet) console.log(JSON.stringify({ ok: true, events: res.events.length }, null, 2));
      process.exit(0);
    } catch (e) {
      console.error(e?.message || String(e));
      process.exit(1);
    }
  }

  if (cmd === 'init' && sub === 'next') {
    const target = args._[2] ? String(args._[2]) : 'examples/next'
    const tmpl = `// Minimal Next.js API route example for Fluxomail token\nimport type { NextApiRequest, NextApiResponse } from 'next'\nexport default async function handler(req: NextApiRequest, res: NextApiResponse) {\n  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })\n  // TODO: Replace with real server-side token minting\n  return res.status(200).json({ token: 'replace-with-real-short-lived-token' })\n}\n`
    const file = path.join(target, 'pages', 'api', 'fluxomail', 'token.ts')
    await mkdir(path.dirname(file), { recursive: true }).catch(() => {})
    await writeFile(file, tmpl, { flag: 'wx' }).catch(() => {})
    if (!args.quiet) console.log('Wrote example to', file)
    return
  }

  if (cmd === 'init' && sub === 'worker') {
    const target = args._[2] ? String(args._[2]) : 'examples/workers'
    const file = path.join(target, 'worker.js')
    const srcUrl = new URL('../examples/workers/worker.js', import.meta.url)
    const src = await readFile(srcUrl).catch(() => null)
    await mkdir(path.dirname(file), { recursive: true }).catch(() => {})
    if (src) await writeFile(file, src, { flag: 'wx' }).catch(() => {})
    if (!args.quiet) console.log('Wrote worker example to', file)
    return
  }

  if (cmd === 'init' && sub === 'next-app') {
    const target = args._[2] ? String(args._[2]) : 'examples/next'
    const tmpl = `// Next.js App Router route handler for Fluxomail token\nexport const runtime = 'nodejs'\nexport async function POST(request: Request) {\n  // TODO: Replace with real server-side token minting\n  return Response.json({ token: 'replace-with-real-short-lived-token' })\n}\n`
    const file = path.join(target, 'app', 'api', 'fluxomail', 'token', 'route.ts')
    await mkdir(path.dirname(file), { recursive: true }).catch(() => {})
    await writeFile(file, tmpl, { flag: 'wx' }).catch(() => {})
    if (!args.quiet) console.log('Wrote example to', file)
    return
  }

  if (cmd === 'timelines' && sub === 'get') {
    if (!apiKey && !tokenCmd && !initialToken) { console.error('Missing auth: provide --api-key or --token-cmd'); process.exit(2); }
    const sendId = args['send-id'] ? String(args['send-id']) : '';
    const limit = args.limit ? Number(args.limit) : undefined;
    const cursor = args.cursor ? String(args.cursor) : undefined;
    if (!sendId) { console.error('timelines get requires --send-id'); process.exit(2); }
    const format = (args.format ? String(args.format) : 'pretty').toLowerCase();
    const outPath = args.output ? String(args.output) : undefined;
    const res = await fm.timelines.get({ sendId, limit, cursor });
    const text = format === 'json' ? JSON.stringify(res) : JSON.stringify(res, null, 2);
    if (!args.quiet) console.log(text);
    if (outPath) await writeFile(outPath, text + '\n');
    return;
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
