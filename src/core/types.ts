export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string; // server-side only
  token?: string; // short-lived token
  version?: string; // API date header
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
  allowApiKeyInBrowser?: boolean; // default false
  beforeRequest?: (ctx: { method: string; url: string; headers: Headers; body?: Json }) => void | Promise<void>;
  afterResponse?: (ctx: { method: string; url: string; status: number; headers: Headers; requestId?: string }) => void | Promise<void>;
}

export interface AuthConfig {
  apiKey?: string;
  token?: string;
}

export type EventEnvelope<T = unknown> = {
  id: string;
  type: string;
  created: string; // ISO 8601
  data: T;
};

export interface ListEventsOptions {
  types?: string[];
  cursor?: string;
  limit?: number;
  since?: string; // ISO timestamp or event id, depending on API contract
}

export interface ListEventsResponse<T = unknown> {
  events: EventEnvelope<T>[];
  nextCursor?: string;
}

export interface SubscribeOptions {
  types?: string[];
  since?: string;
  signal?: AbortSignal;
  getToken?: () => string | undefined | Promise<string | undefined>;
  checkpoint?: {
    get: () => string | undefined | Promise<string | undefined>;
    set: (id: string) => void | Promise<void>;
  };
}

export type EventHandler<T = unknown> = (evt: EventEnvelope<T>) => void;

export interface Subscription {
  close(): void;
}

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  // v1 canonical
  content?: string; // text
  htmlContent?: string;
  // legacy synonyms (mapped to canonical)
  html?: string;
  text?: string;
  // optional metadata/headers
  from?: string; // deprecated alias (prefer fromEmail)
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  policyKey?: string;
  identityId?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Attachment[];
  headers?: Record<string, string>;
  idempotencyKey?: string;
  idempotentRetry?: number; // max attempts if idempotencyKey present (>=1)
}

export interface SendEmailResponse {
  sendId: string;
  accepted?: boolean;
}

export interface GetTimelineOptions {
  sendId: string;
  cursor?: string;
  limit?: number;
}

export interface GetTimelineResponse<T = unknown> {
  events: EventEnvelope<T>[];
  nextCursor?: string;
}

export interface IterateEventsOptions extends ListEventsOptions {
  signal?: AbortSignal;
  maxPages?: number;
}

// Attachments
export interface Attachment {
  filename: string;
  content: string | Uint8Array; // raw or base64 string
  contentType?: string;
}

// Typed event unions (baseline)
export type EmailEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.opened'
  | 'email.clicked'
  | 'email.bounced'
  | 'email.complained'
  | 'email.failed'
  | 'email.dropped';

export interface EmailEventDataBase {
  sendId: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
  [k: string]: unknown;
}

export type EventDataByType<K extends EmailEventType> = EmailEventDataBase;

export type EmailEventEnvelope<K extends EmailEventType = EmailEventType> = Omit<EventEnvelope, 'type' | 'data'> & {
  type: K;
  data: EventDataByType<K>;
};

export function isEmailEventType(type: string): type is EmailEventType {
  return (
    type === 'email.sent' ||
    type === 'email.delivered' ||
    type === 'email.opened' ||
    type === 'email.clicked' ||
    type === 'email.bounced' ||
    type === 'email.complained' ||
    type === 'email.failed' ||
    type === 'email.dropped'
  );
}
