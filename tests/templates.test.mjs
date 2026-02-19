import test from 'node:test'
import assert from 'node:assert/strict'
import { Fluxomail } from '../dist/index.js'

test('templates getter is removed (no backend implementation)', async () => {
  const fm = new Fluxomail({ apiKey: 'k', baseUrl: 'http://localhost:1' })
  assert.equal(fm.templates, undefined)
})
