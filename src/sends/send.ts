import type { HttpClient } from '../core/http.js';
import type { SendEmailRequest, SendEmailResponse, Attachment } from '../core/types.js';

function buildBody(req: SendEmailRequest): Record<string, unknown> {
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
    const enc = (a: Attachment) => {
      let b64: string | undefined;
      if (typeof a.content === 'string') {
        // assume already base64 if it looks like; else base64-encode string
        const looksB64 = /^[A-Za-z0-9+/=\r\n]+$/.test(a.content) && a.content.length % 4 === 0;
        b64 = looksB64 ? a.content : (typeof Buffer !== 'undefined' ? Buffer.from(a.content, 'utf8').toString('base64') : btoa(a.content));
      } else {
        // Uint8Array
        if (typeof Buffer !== 'undefined') b64 = Buffer.from(a.content).toString('base64');
        else {
          let s = '';
          const bytes = a.content as Uint8Array;
          for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
          // @ts-ignore btoa may not exist in Node
          b64 = btoa(s);
        }
      }
      return { filename: a.filename, contentBase64: b64!, ...(a.contentType ? { contentType: a.contentType } : {}) };
    };
    body.attachments = req.attachments.map(enc);
  }
  return body;
}

export async function sendEmail(client: HttpClient, req: SendEmailRequest): Promise<SendEmailResponse> {
  const { idempotencyKey, idempotentRetry } = req;
  const payload = buildBody(req);
  const attempts = Math.max(1, Number(idempotentRetry || 1));
  let lastErr: unknown = undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      // Public API path: POST /api/v1/emails/send
      return await client.request('POST', '/emails/send', { body: payload, idempotencyKey });
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
