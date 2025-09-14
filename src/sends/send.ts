import type { HttpClient } from '../core/http.js';
import type { SendEmailRequest, SendEmailResponse } from '../core/types.js';

export async function sendEmail(client: HttpClient, req: SendEmailRequest): Promise<SendEmailResponse> {
  const { idempotencyKey, ...payload } = req;
  return client.request('POST', '/sends', { body: payload, idempotencyKey });
}
