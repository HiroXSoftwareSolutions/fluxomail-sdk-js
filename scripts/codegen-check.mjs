#!/usr/bin/env node
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { stat } from 'node:fs/promises'

const exec = promisify(_exec)

async function main() {
  const spec = (process.env.FLUXOMAIL_OPENAPI || '').trim()
  if (!spec) {
    console.log('FLUXOMAIL_OPENAPI not set; skipping codegen drift check')
    return
  }
  try { await stat('src/gen/openapi-types.ts') } catch {
    console.log('No generated types found; skipping drift check')
    return
  }
  try {
    await exec('git add -N src/gen/openapi-types.ts')
    await exec('git diff --exit-code -- src/gen/openapi-types.ts')
    console.log('No codegen drift detected')
  } catch {
    console.error('OpenAPI types drift detected. Run: npm run codegen:openapi and commit changes.')
    process.exit(1)
  }
}

main().catch((e) => { console.error(e?.stack || e?.message || String(e)); process.exit(1) })

