import type { HttpClient } from '../core/http.js'
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ListTemplatesOptions,
  ListTemplatesResponse,
  RenderTemplateRequest,
  RenderTemplateResponse,
} from '../core/types.js'

export async function createTemplate(client: HttpClient, req: CreateTemplateRequest): Promise<Template> {
  const out = await client.request<Template>('POST', '/templates', { body: req })
  return out
}

export async function updateTemplate(client: HttpClient, id: string, req: UpdateTemplateRequest): Promise<Template> {
  const out = await client.request<Template>('PUT', `/templates/${encodeURIComponent(id)}`, { body: req })
  return out
}

export async function getTemplate(client: HttpClient, id: string, opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Template> {
  const out = await client.request<Template>('GET', `/templates/${encodeURIComponent(id)}`, { signal: opts.signal, timeoutMs: opts.timeoutMs })
  return out
}

export async function listTemplates(client: HttpClient, opts: ListTemplatesOptions = {}): Promise<ListTemplatesResponse> {
  const query = { cursor: opts.cursor, limit: opts.limit }
  const out = await client.request<ListTemplatesResponse>('GET', '/templates', { query, signal: opts.signal, timeoutMs: opts.timeoutMs, retry: opts.retry })
  // Keep shape as-is
  return out
}

export async function deleteTemplate(client: HttpClient, id: string, opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<{ deleted: boolean }>
{
  // Some backends return 204 No Content; treat any 2xx as success
  await client.request('DELETE', `/templates/${encodeURIComponent(id)}`, { signal: opts.signal, timeoutMs: opts.timeoutMs })
  return { deleted: true }
}

export async function renderTemplate(client: HttpClient, id: string, req: RenderTemplateRequest): Promise<RenderTemplateResponse> {
  const out = await client.request<RenderTemplateResponse>('POST', `/templates/${encodeURIComponent(id)}/render`, { body: req })
  return out
}

