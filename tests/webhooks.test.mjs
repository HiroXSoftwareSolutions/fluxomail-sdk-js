import test from 'node:test'
import assert from 'node:assert/strict'
import { webhooks } from '../dist/index.js'

test('verifyHmacSignature validates sha256 header and parse helpers work', async () => {
  const secret = 's'
  const body = JSON.stringify({ id: '1', type: 'email.delivered', created: new Date().toISOString(), data: {} })
  // compute HMAC
  const { createHmac } = await import('node:crypto')
  const h = createHmac('sha256', secret).update(body, 'utf8').digest('hex')
  const headers = { 'fluxomail-signature': 'sha256=' + h }
  const ok = webhooks.verifyHmacSignature(body, headers, { secret })
  assert.equal(ok, true)
  const parsed = webhooks.parseEventEnvelope(body)
  assert.ok(parsed && parsed.id === '1')
  const both = webhooks.verifyAndParse(body, headers, { secret })
  assert.equal(both.ok, true)
  assert.equal(both.events.length, 1)
})

