export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string; // server-side only
  token?: string; // short-lived token
  version?: string; // API date header
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
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
}

export type EventHandler<T = unknown> = (evt: EventEnvelope<T>) => void;

export interface Subscription {
  close(): void;
}

export interface SendEmailRequest {
  to: string | string[];
  from?: string;
  subject?: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
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
