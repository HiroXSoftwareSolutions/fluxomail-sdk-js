export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string; // server-side only
  token?: string; // short-lived token
  getToken?: () => string | undefined | Promise<string | undefined>; // token refresher for REST
  version?: string; // API date header
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
  allowApiKeyInBrowser?: boolean; // default false
  beforeRequest?: (ctx: { method: string; url: string; headers: Headers; body?: Json }) => void | Promise<void>;
  afterResponse?: (ctx: { method: string; url: string; status: number; headers: Headers; requestId?: string }) => void | Promise<void>;
  retry?: RetryPolicy;
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
  /** Filter by SMTP response code (e.g. "250", "550") */
  smtpCode?: string;
  /** Filter by remote MTA hostname */
  mtaHost?: string;
  /** Filter by recipient domain (e.g. "gmail.com") */
  domain?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: RetryPolicy;
}

export interface ListEventsResponse<T = unknown> {
  events: EventEnvelope<T>[];
  nextCursor?: string | null;
}

export interface GetMetricsOptions {
  window?: '24h' | '7d' | '30d' | 'all';
  since?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: RetryPolicy;
}

export interface MetricsResponse {
  window: {
    preset: '24h' | '7d' | '30d' | 'all';
    since: string;
    until: string;
  };
  scanned: {
    sends: number;
    sendScanLimit: number;
  };
  metrics: {
    totalSent: number;
    totalDelivered: number;
    deliveryRate: number;
    totalOpened: number;
    uniqueOpens: number;
    avgOpenRate: number;
    totalClicked: number;
    uniqueClicks: number;
    avgClickRate: number;
    avgClickToOpenRate: number;
    totalBounced: number;
    bounceRate: number;
    totalComplained: number;
    complaintRate: number;
    totalDelayed: number;
    delayedRate: number;
    [k: string]: unknown;
  };
}

export interface SubscribeOptions {
  types?: string[];
  since?: string;
  /** Filter by SMTP response code (e.g. "250", "550") */
  smtpCode?: string;
  /** Filter by remote MTA hostname */
  mtaHost?: string;
  /** Filter by recipient domain (e.g. "gmail.com") */
  domain?: string;
  signal?: AbortSignal;
  getToken?: () => string | undefined | Promise<string | undefined>;
  checkpoint?: {
    get: () => string | undefined | Promise<string | undefined>;
    set: (id: string) => void | Promise<void>;
  };
  onOpen?: () => void;
  onError?: (error?: unknown) => void;
  onReconnect?: (attempt: number, delayMs: number) => void;
  backoff?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
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
  signal?: AbortSignal;
  timeoutMs?: number;
  /** @deprecated Templates API is not yet available. This field is reserved for future use. */
  templateId?: string;
  /** @deprecated Template variables are not yet available. This field is reserved for future use. */
  variables?: Record<string, Json>;
  /** @deprecated Personalizations are not yet available. This field is reserved for future use. */
  personalizations?: Array<{
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    variables?: Record<string, Json>;
  }>;
}

export interface SendEmailResponse {
  sendId: string;
  accepted?: boolean;
  status?: string;
}

export interface GetTimelineOptions {
  sendId: string;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: RetryPolicy;
}

export interface GetTimelineResponse<T = unknown> {
  events: EventEnvelope<T>[];
  nextCursor?: string | null;
}

export interface IterateEventsOptions extends ListEventsOptions {
  signal?: AbortSignal;
  maxPages?: number;
}

export interface IterateTimelineOptions extends GetTimelineOptions {
  maxPages?: number;
}

export interface RetryPolicy {
  maxAttempts?: number; // default 3 for idempotent reads
  retriableStatuses?: number[]; // default: 408, 429, 500-599
  baseDelayMs?: number; // default 250ms
  maxDelayMs?: number; // default 2000ms
}

// Preferences
export interface GetPreferencesOptions {
  /** Unsubscribe token for contact identification */
  token?: string;
  /** Contact email for identification (alternative to token) */
  email?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface PreferencesCategory {
  key: string;
  name?: string;
  description?: string;
  [k: string]: unknown;
}

export interface PreferencesSubscription {
  categoryKey: string;
  subscribed: boolean;
  [k: string]: unknown;
}

export interface GetPreferencesResponse {
  contact: { id: string; email: string };
  categories: PreferencesCategory[];
  subscriptions: PreferencesSubscription[];
}

export interface UpdatePreferencesRequest {
  /** Unsubscribe token for contact identification */
  token?: string;
  /** Contact email for identification (alternative to token) */
  email?: string;
  subscriptions: Array<{ categoryKey: string; subscribed: boolean }>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface UpdatePreferencesResponse {
  ok: true;
}

// Contact Sync
export type ContactPlan = 'free' | 'pro' | 'unlimited' | 'lifetime';

export interface ContactSyncContact {
  email: string;
  externalId?: string;
  name?: string;
  plan?: ContactPlan;
  subscribed?: boolean;
  categories?: string[];
  metadata?: Record<string, Json>;
  sourceUpdatedAt?: number | string;
  planStartedAt?: number | string;
  planEndsAt?: number | string;
  state?: string;
  eventId?: string;
  deleted?: boolean;
}

export interface SyncContactsRequest {
  source?: string;
  contacts: ContactSyncContact[];
  idempotencyKey?: string;
  /** Retry transient failures. Safe when idempotencyKey is provided or every row has eventId. Default: 3 */
  idempotentRetry?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface SyncContactsResponse {
  ok: boolean;
  source: string;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  skippedStale: number;
  skippedDuplicate: number;
  unsubscribed: number;
  resubscribed: number;
  replayed?: boolean;
  syncedAt?: number;
  errors?: Array<{ email: string; message: string }>;
}

// Templates (deprecated — no backend implementation exists)
/** @deprecated Templates API is not yet available. */
export interface Template {
  id: string;
  name?: string;
  subject?: string;
  htmlContent?: string;
  content?: string;
  created?: string;
  updated?: string;
  [k: string]: unknown;
}

/** @deprecated Templates API is not yet available. */
export interface CreateTemplateRequest {
  name: string;
  subject?: string;
  htmlContent?: string;
  content?: string;
}

/** @deprecated Templates API is not yet available. */
export interface UpdateTemplateRequest {
  name?: string;
  subject?: string;
  htmlContent?: string;
  content?: string;
}

/** @deprecated Templates API is not yet available. */
export interface RenderTemplateRequest {
  variables?: Record<string, Json>;
}

/** @deprecated Templates API is not yet available. */
export interface RenderTemplateResponse {
  subject?: string;
  html?: string;
  content?: string;
  [k: string]: unknown;
}

/** @deprecated Templates API is not yet available. */
export interface ListTemplatesOptions {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: RetryPolicy;
}

/** @deprecated Templates API is not yet available. */
export interface ListTemplatesResponse {
  templates: Template[];
  nextCursor?: string | null;
}

// Typed event data (basic discriminated unions)
export interface EmailSentEventData extends EmailEventDataBase {}
export interface EmailDeliveredEventData extends EmailEventDataBase {}
export interface EmailOpenedEventData extends EmailEventDataBase { ip?: string; userAgent?: string }
export interface EmailClickedEventData extends EmailEventDataBase { url?: string; ip?: string; userAgent?: string }
export interface EmailBouncedEventData extends EmailEventDataBase { reason?: string; subtype?: string }
export interface EmailComplainedEventData extends EmailEventDataBase { providerReason?: string }
export interface EmailFailedEventData extends EmailEventDataBase { reason?: string }
export interface EmailDroppedEventData extends EmailEventDataBase { reason?: string }

export type EventDataByType<K extends EmailEventType> =
  K extends 'email.sent' ? EmailSentEventData :
  K extends 'email.delivered' ? EmailDeliveredEventData :
  K extends 'email.opened' ? EmailOpenedEventData :
  K extends 'email.clicked' ? EmailClickedEventData :
  K extends 'email.bounced' ? EmailBouncedEventData :
  K extends 'email.complained' ? EmailComplainedEventData :
  K extends 'email.failed' ? EmailFailedEventData :
  K extends 'email.dropped' ? EmailDroppedEventData :
  EmailEventDataBase;

export type EventHandlerByType<K extends EmailEventType> = (evt: EmailEventEnvelope<K>) => void;

// Attachments
export interface Attachment {
  filename: string;
  content: string | Uint8Array | Blob; // raw or base64 string, or Blob/File in browsers
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
