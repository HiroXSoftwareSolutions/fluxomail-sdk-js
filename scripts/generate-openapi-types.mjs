#!/usr/bin/env node
import { mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const root = new URL('..', import.meta.url).pathname
  const outDir = path.join(root, 'src', 'gen')
  const outFile = path.join(outDir, 'openapi-types.ts')
  await mkdir(outDir, { recursive: true })
  let openapiTS
  try {
    const mod = await import('openapi-typescript')
    openapiTS = mod && (mod.default || mod)
  } catch {}
  try {
    const envSpec = process.env.FLUXOMAIL_OPENAPI
    // Prefer env var; fall back to a repo-relative sibling email-service checkout if present
    const fallbackSpec = path.join(root, '..', 'email-service', 'openapi', '2025-09-01.yaml')
    let spec = envSpec && envSpec.trim() ? envSpec.trim() : ''
    if (!spec) {
      try { await stat(fallbackSpec); spec = fallbackSpec } catch {}
    }
    if (openapiTS && spec) {
      const types = await openapiTS(spec, { httpHeaders: true })
      await writeFile(outFile, String(types))
      console.log('Generated types to', outFile)
      return
    }
  } catch (e) {
    console.error('OpenAPI codegen failed:', e && e.message ? e.message : String(e))
  }
  await writeFile(outFile, "// Placeholder types\nexport type Placeholder = unknown;\n")
  console.log('Wrote placeholder types to', outFile)
}

main().catch(() => {})
