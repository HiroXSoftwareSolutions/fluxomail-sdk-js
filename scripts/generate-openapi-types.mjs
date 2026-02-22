#!/usr/bin/env node
import { mkdir, writeFile, stat, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function main() {
  const root = new URL('..', import.meta.url).pathname
  const outDir = path.join(root, 'src', 'gen')
  const outFile = path.join(outDir, 'openapi-types.ts')
  await mkdir(outDir, { recursive: true })
  let openapiTS
  let openapiMod
  try {
    openapiMod = await import('openapi-typescript')
    openapiTS = openapiMod && (openapiMod.default || openapiMod)
  } catch {}
  const envSpec = process.env.FLUXOMAIL_OPENAPI
  const fallbackSpec = path.join(root, '..', 'openapi', '2025-09-01.yaml')
  let spec = envSpec && envSpec.trim() ? envSpec.trim() : ''
  if (!spec) {
    try { await stat(fallbackSpec); spec = fallbackSpec } catch {}
  }
  if (openapiTS && spec) {
    try {
      const specInput = /^https?:\/\//i.test(spec) ? spec : pathToFileURL(spec)
      const generated = await openapiTS(specInput, { httpHeaders: true })
      const types =
        typeof generated === 'string'
          ? generated
          : (typeof openapiMod?.astToString === 'function' ? openapiMod.astToString(generated) : String(generated))
      await writeFile(outFile, types)
      console.log('Generated types to', outFile)
      return
    } catch (e) {
      console.error('OpenAPI codegen failed:', e && e.message ? e.message : String(e))
    }
  }

  // No spec available — only write the stub if the file doesn't exist yet
  // or already contains a stub. Never overwrite real generated types.
  let existing = ''
  try { existing = await readFile(outFile, 'utf8') } catch {}
  if (existing && !existing.startsWith('// Auto-generated stub')) {
    console.log('No OpenAPI spec found — keeping existing types at', outFile)
    return
  }

  const stub = `// Auto-generated stub (no OpenAPI spec available)\n` +
`export type HttpMethod = 'get'|'put'|'post'|'delete'|'patch'|'options'|'head'|'trace';\n` +
`export type paths = Record<string, Partial<Record<HttpMethod, any>>>;\n` +
`export type components = { schemas?: Record<string, any> } & Record<string, any>;\n`

  await writeFile(outFile, stub)
  console.log('Wrote stub types to', outFile)
}

main().catch(() => {})
