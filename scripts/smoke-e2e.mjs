#!/usr/bin/env node
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import assert from 'node:assert/strict'

const exec = promisify(_exec)

async function getTokenFromCmd(cmd) {
  const { stdout } = await exec(cmd)
  return String(stdout || '').trim()
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const baseUrl = process.env.FLUXOMAIL_BASE_URL || 'https://api.fluxomail.com/api/v1'
  const apiKey = process.env.FLUXOMAIL_API_KEY || ''
  const tokenCmd = process.env.FLUXOMAIL_TOKEN_CMD || ''
  const to = process.env.FLUXOMAIL_TEST_TO || 'test@example.com'

  const { Fluxomail } = await import('../dist/index.js')

  let token = undefined
  if (!apiKey && tokenCmd) token = await getTokenFromCmd(tokenCmd)

  const fm = new Fluxomail({
    baseUrl,
    apiKey: apiKey || undefined,
    token,
    getToken: tokenCmd ? () => getTokenFromCmd(tokenCmd) : undefined,
    version: '2025-09-01',
  })

  console.log('E2E: send')
  const send = await fm.sends.send({ to, subject: 'SDK smoke', content: 'Hello', idempotencyKey: `smoke-${Date.now()}` })
  assert.ok(send.sendId)
  console.log('sendId:', send.sendId)

  console.log('E2E: timeline')
  const tl = await fm.timelines.get({ sendId: send.sendId, limit: 1 })
  assert.ok(tl && typeof tl === 'object')

  console.log('E2E: list events')
  const ev = await fm.events.list({ limit: 1 })
  assert.ok(ev && Array.isArray(ev.events))

  console.log('E2E: SSE subscribe (2s)')
  let count = 0
  const sub = fm.events.subscribe({ types: ['email.*'], checkpoint: {
    get: () => undefined,
    set: () => {}
  } }, () => { count++ })
  await sleep(2000)
  sub.close()
  console.log('sse events seen:', count)

  console.log('E2E OK')
}

main().catch((err) => { console.error(err?.stack || err?.message || String(err)); process.exit(1) })

