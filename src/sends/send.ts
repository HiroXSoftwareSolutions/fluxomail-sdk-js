import type { HttpClient } from '../core/http.js';
import type { SendEmailRequest, SendEmailResponse, Attachment } from '../core/types.js';
import type { OpenAPISendResponseBody } from '../core/openapi.js';
import { asOpenAPISendBody } from '../core/openapi.js';

async function toBase64(content: string | Uint8Array | Blob): Promise<string> {
  // String: treat as base64 if it looks like it; else encode
  if (typeof content === 'string') {
    const looksB64 = /^[A-Za-z0-9+/=\r\n]+$/.test(content) && content.length % 4 === 0;
    if (looksB64) return content;
    if (typeof Buffer !== 'undefined') return Buffer.from(content, 'utf8').toString('base64');
    // @ts-ignore btoa may not exist in Node
    return btoa(content);
  }
  // Uint8Array
  if (content instanceof Uint8Array) {
    if (typeof Buffer !== 'undefined') return Buffer.from(content).toString('base64');
    let s = '';
    for (let i = 0; i < content.length; i++) s += String.fromCharCode(content[i]);
    // @ts-ignore btoa may not exist in Node
    return btoa(s);
  }
  // Blob/File (browser or Node >=18)
  if (typeof (content as Blob).arrayBuffer === 'function') {
    const ab = await (content as Blob).arrayBuffer();
    if (typeof Buffer !== 'undefined') return Buffer.from(ab).toString('base64');
    let s = '';
    const view = new Uint8Array(ab);
    for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
    // @ts-ignore btoa may not exist in Node
    return btoa(s);
  }
  throw new Error('Unsupported attachment content type');
}

async function buildBody(req: SendEmailRequest): Promise<Record<string, unknown>> {
  const to = req.to;
  const subject = req.subject;
  const content = req.content ?? req.text;
  const htmlContent = req.htmlContent ?? req.html;
  const fromEmail = req.fromEmail ?? (req.from ? String(req.from).match(/<([^>]+)>/)?.[1] || undefined : undefined);
  const fromName = req.fromName ?? (req.from ? String(req.from).replace(/<[^>]+>/, '').trim() || undefined : undefined);
  const body: Record<string, unknown> = {
    to,
    subject,
    ...(content ? { content } : {}),
    ...(htmlContent ? { htmlContent } : {}),
    ...(req.templateId ? { templateId: req.templateId } : {}),
    ...(req.variables ? { variables: req.variables } : {}),
    ...(req.personalizations ? { personalizations: req.personalizations } : {}),
    ...(fromEmail ? { fromEmail } : {}),
    ...(fromName ? { fromName } : {}),
    ...(req.replyTo ? { replyTo: req.replyTo } : {}),
    ...(req.policyKey ? { policyKey: req.policyKey } : {}),
    ...(req.identityId ? { identityId: req.identityId } : {}),
    ...(req.cc ? { cc: req.cc } : {}),
    ...(req.bcc ? { bcc: req.bcc } : {}),
    ...(req.headers ? { headers: req.headers } : {}),
  };
  if (req.attachments && req.attachments.length > 0) {
    const enc = async (a: Attachment) => {
      const b64 = await toBase64(a.content as any);
      return { filename: a.filename, contentBase64: b64, ...(a.contentType ? { contentType: a.contentType } : {}) };
    };
    body.attachments = await Promise.all(req.attachments.map(enc));
  }
  // Prepare for OpenAPI body adoption (no runtime change)
  return asOpenAPISendBody(body) as unknown as Record<string, unknown>;
}

export async function sendEmail(client: HttpClient, req: SendEmailRequest): Promise<SendEmailResponse> {
  const { idempotencyKey, idempotentRetry } = req;
  const payload = await buildBody(req);
  const attempts = Math.max(1, Number(idempotentRetry || 1));
  let lastErr: unknown = undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      // Public API path: POST /api/v1/emails/send
      const r = await client.request<OpenAPISendResponseBody>('POST', '/emails/send', { body: payload, idempotencyKey, signal: req.signal, timeoutMs: req.timeoutMs });
      return r as unknown as SendEmailResponse;
    } catch (e: any) {
      lastErr = e;
      const status = e?.status as number | undefined;
      const code = (e?.code as string | undefined)?.toLowerCase?.() || '';
      const retriable = (status !== undefined && (status >= 500 || status === 429)) || code.includes('network') || code.includes('timeout');
      const hasIdem = !!idempotencyKey;
      if (i < attempts - 1 && hasIdem && retriable) {
        const wait = Math.min(2000, 100 * Math.pow(2, i)) + Math.floor(Math.random() * 50);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('send failed');
}

/**
 * Send an email via the global endpoint (POST /emails/send-global).
 * This uses the org-level configuration without per-send tracking overhead.
 */
export async function sendEmailGlobal(client: HttpClient, req: SendEmailRequest): Promise<SendEmailResponse> {
  const { idempotencyKey, idempotentRetry } = req;
  const payload = await buildBody(req);
  const attempts = Math.max(1, Number(idempotentRetry || 1));
  let lastErr: unknown = undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await client.request<SendEmailResponse>('POST', '/emails/send-global', { body: payload as any, idempotencyKey, signal: req.signal, timeoutMs: req.timeoutMs });
      return r;
    } catch (e: any) {
      lastErr = e;
      const status = e?.status as number | undefined;
      const code = (e?.code as string | undefined)?.toLowerCase?.() || '';
      const retriable = (status !== undefined && (status >= 500 || status === 429)) || code.includes('network') || code.includes('timeout');
      const hasIdem = !!idempotencyKey;
      if (i < attempts - 1 && hasIdem && retriable) {
        const wait = Math.min(2000, 100 * Math.pow(2, i)) + Math.floor(Math.random() * 50);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('send failed');
}

export async function sendEmailWithMeta(client: HttpClient, req: SendEmailRequest): Promise<{ data: SendEmailResponse; meta: { status: number; headers: Headers; requestId?: string } }> {
  const { idempotencyKey } = req;
  const payload = await buildBody(req);
  const out = await client.requestWithMeta<OpenAPISendResponseBody>('POST', '/emails/send', { body: payload, idempotencyKey, signal: req.signal, timeoutMs: req.timeoutMs });
  return { data: out.data as unknown as SendEmailResponse, meta: out.meta };
}
