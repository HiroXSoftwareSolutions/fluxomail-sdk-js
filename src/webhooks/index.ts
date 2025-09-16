import type { EmailEventEnvelope } from '../core/types.js'

// Node.js crypto is available in Node environments; typed as any to avoid ESM import issues
// at build time across browser targets. Only call these on the server.
let nodeCrypto: any
try { nodeCrypto = await import('node:crypto') } catch {}

export type VerifyOptions = {
  secret: string
  headerName?: string // defaults: 'fluxomail-signature'
  algorithm?: 'sha256' // reserved for future algorithms
}

/**
 * Verify an HMAC-SHA256 signature header over the raw body string.
 * Header value formats supported: `<hex>` or `sha256=<hex>`.
 */
export function verifyHmacSignature(rawBody: string, headers: Headers | Record<string, string | string[] | undefined>, opts: VerifyOptions): boolean {
  if (!nodeCrypto) throw new Error('verifyHmacSignature is server-only (Node.js)')
  const name = (opts.headerName || 'fluxomail-signature').toLowerCase()
  const get = (k: string) => {
    if (headers instanceof Headers) return headers.get(k)
    const v = (headers as any)[k] ?? (headers as any)[k.toLowerCase?.()] ?? (headers as any)[k.toUpperCase?.()]
    if (Array.isArray(v)) return v[0]
    return v
  }
  const header = String(get(name) || get('x-' + name) || '')
  if (!header) return false
  const value = header.startsWith('sha256=') ? header.slice('sha256='.length) : header
  const hmac = nodeCrypto.createHmac('sha256', opts.secret)
  hmac.update(rawBody, 'utf8')
  const digest = hmac.digest('hex')
  // constant-time compare
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(value, 'hex')
  if (a.length !== b.length) return false
  return nodeCrypto.timingSafeEqual(a, b)
}

export function parseEventEnvelope(rawBody: string): EmailEventEnvelope | undefined {
  try { return JSON.parse(rawBody) as EmailEventEnvelope } catch { return undefined }
}

export function parseEventEnvelopes(rawBody: string): EmailEventEnvelope[] | undefined {
  try {
    const j = JSON.parse(rawBody)
    if (Array.isArray(j)) return j as EmailEventEnvelope[]
    if (j && typeof j === 'object' && Array.isArray((j as any).events)) return (j as any).events as EmailEventEnvelope[]
    return [j as EmailEventEnvelope]
  } catch { return undefined }
}

export function verifyAndParse(rawBody: string, headers: Headers | Record<string, string | string[] | undefined>, opts: VerifyOptions): { ok: true, events: EmailEventEnvelope[] } | { ok: false } {
  const ok = verifyHmacSignature(rawBody, headers, opts)
  if (!ok) return { ok: false }
  const ev = parseEventEnvelopes(rawBody) || []
  return { ok: true, events: ev }
}
