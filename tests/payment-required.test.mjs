import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyHttpError, PaymentRequiredError } from '../dist/index.js'

test('classifyHttpError returns PaymentRequiredError for 402', () => {
  const body = { code: 'plan_required', message: 'Events API not enabled', preview: { plan: 'pro' } }
  const err = classifyHttpError(402, body, 'req-123')
  assert.ok(err instanceof PaymentRequiredError)
  assert.equal(err.status, 402)
  assert.equal(err.code, 'plan_required')
  assert.equal(err.requestId, 'req-123')
  assert.deepStrictEqual(err.preview, { plan: 'pro' })
  assert.ok(err.message.includes('Events API'))
})
