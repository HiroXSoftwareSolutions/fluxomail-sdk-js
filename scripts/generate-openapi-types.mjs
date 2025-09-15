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
  const envSpec = (process.env.FLUXOMAIL_OPENAPI || '').trim()
  const isHttp = (s) => s.startsWith('http://') || s.startsWith('https://')
  const fileExists = async (p) => { try { await stat(p); return true } catch { return false } }

  if (openapiTS && envSpec && (isHttp(envSpec) || await fileExists(envSpec))) {
    try {
      const types = await openapiTS(envSpec)
      await writeFile(outFile, String(types))
      console.log('Generated types to', outFile)
      return
    } catch (e) {
      console.error('OpenAPI codegen failed:', e && e.message ? e.message : String(e))
    }
  } else if (envSpec) {
    console.warn('FLUXOMAIL_OPENAPI is set but not a valid file/URL; writing stub types')
  } else {
    console.log('FLUXOMAIL_OPENAPI not provided; writing stub types')
  }

  const stub = `// Auto-generated stub (no OpenAPI spec available)\n` +
`export type HttpMethod = 'get'|'put'|'post'|'delete'|'patch'|'options'|'head'|'trace';\n` +
`export type paths = Record<string, Partial<Record<HttpMethod, any>>>;\n` +
`export type components = { schemas?: Record<string, any> } & Record<string, any>;\n`

  await writeFile(outFile, stub)
  console.log('Wrote stub types to', outFile)
}

main().catch(() => {})
