import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

async function exists(p) { try { await stat(p); return true } catch { return false } }

test('CLI init next writes pages token route and creates dirs', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fluxo-init-next-'))
  try {
    const child = spawn(process.execPath, ['bin/fluxomail.mjs', 'init', 'next', dir], { cwd: new URL('..', import.meta.url).pathname })
    await new Promise((r) => child.on('close', r))
    const file = path.join(dir, 'pages', 'api', 'fluxomail', 'token.ts')
    assert.equal(await exists(file), true)
    const text = await readFile(file, 'utf8')
    assert.ok(text.includes('replace-with-real-short-lived-token'))
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('CLI init next-app writes app router token route and creates dirs', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fluxo-init-nextapp-'))
  try {
    const child = spawn(process.execPath, ['bin/fluxomail.mjs', 'init', 'next-app', dir], { cwd: new URL('..', import.meta.url).pathname })
    await new Promise((r) => child.on('close', r))
    const file = path.join(dir, 'app', 'api', 'fluxomail', 'token', 'route.ts')
    assert.equal(await exists(file), true)
    const text = await readFile(file, 'utf8')
    assert.ok(text.includes('replace-with-real-short-lived-token'))
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('CLI init worker writes example file and creates dirs', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fluxo-init-worker-'))
  try {
    const child = spawn(process.execPath, ['bin/fluxomail.mjs', 'init', 'worker', dir], { cwd: new URL('..', import.meta.url).pathname })
    await new Promise((r) => child.on('close', r))
    const file = path.join(dir, 'worker.js')
    assert.equal(await exists(file), true)
    const text = await readFile(file, 'utf8')
    assert.ok(text.includes('@fluxomail/sdk'))
  } finally { await rm(dir, { recursive: true, force: true }) }
})

