import type {
  ClientConfig,
  ListEventsOptions,
  ListEventsResponse,
  GetMetricsOptions,
  MetricsResponse,
  SubscribeOptions,
  EventHandler,
  Subscription,
  SendEmailRequest,
  SendEmailResponse,
  GetTimelineOptions,
  GetTimelineResponse,
  GetPreferencesOptions,
  GetPreferencesResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  SyncContactsRequest,
  SyncContactsResponse,
  EmailEventType,
  EmailEventEnvelope,
} from './core/types.js';

import { HttpClient } from './core/http.js';
import { listEvents, listEventsWithMeta } from './events/list.js';
import { subscribe } from './events/stream.js';
import { iterateEvents } from './events/iterate.js';
import { getMetrics } from './metrics/get.js';
import { sendEmail, sendEmailGlobal, sendEmailWithMeta } from './sends/send.js';
import { getTimeline, getTimelineWithMeta } from './timelines/get.js';
import { iterateTimeline } from './timelines/iterate.js';
import { getPreferences, updatePreferences } from './preferences/index.js';
import { syncContacts } from './contacts/index.js';
export * as webhooks from './webhooks/index.js';
export * as audience from './audience/index.js';

export * from './core/errors.js';
export * from './core/types.js';

export class Fluxomail {
  private readonly client: HttpClient;

  constructor(cfg: ClientConfig = {}) {
    this.client = new HttpClient(cfg);
  }

  get events() {
    const client = this.client;
    const sub = ((opts: SubscribeOptions, onEvent: EventHandler<any>) => subscribe<any>(client, opts, onEvent)) as {
      <K extends EmailEventType>(opts: SubscribeOptions & { types: K[] }, onEvent: (evt: EmailEventEnvelope<K>) => void): Subscription;
      <T = unknown>(opts: SubscribeOptions, onEvent: EventHandler<T>): Subscription;
    };
    return {
      list: <T = unknown>(opts: ListEventsOptions = {}): Promise<ListEventsResponse<T>> => listEvents<T>(client, opts),
      listWithMeta: <T = unknown>(opts: ListEventsOptions = {}) => listEventsWithMeta<T>(client, opts),
      subscribe: sub,
      iterate: <T = unknown>(opts: ListEventsOptions = {}) => iterateEvents<T>(client, opts),
    } as const;
  }

  get metrics() {
    const client = this.client;
    return {
      get: (opts: GetMetricsOptions = {}): Promise<MetricsResponse> => getMetrics(client, opts),
    } as const;
  }

  get sends() {
    const client = this.client;
    return {
      send: (req: SendEmailRequest): Promise<SendEmailResponse> => sendEmail(client, req),
      sendWithMeta: (req: SendEmailRequest) => sendEmailWithMeta(client, req),
      /** Send via the global endpoint (POST /emails/send-global). */
      sendGlobal: (req: SendEmailRequest): Promise<SendEmailResponse> => sendEmailGlobal(client, req),
    } as const;
  }

  get timelines() {
    const client = this.client;
    return {
      get: <T = unknown>(opts: GetTimelineOptions): Promise<GetTimelineResponse<T>> => getTimeline<T>(client, opts),
      getWithMeta: <T = unknown>(opts: GetTimelineOptions) => getTimelineWithMeta<T>(client, opts),
      iterate: <T = unknown>(opts: GetTimelineOptions & { maxPages?: number }) => iterateTimeline<T>(client, opts),
    } as const;
  }

  get preferences() {
    const client = this.client;
    return {
      get: (opts: GetPreferencesOptions = {}): Promise<GetPreferencesResponse> => getPreferences(client, opts),
      update: (req: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse> => updatePreferences(client, req),
    } as const;
  }

  get contacts() {
    const client = this.client;
    return {
      sync: (req: SyncContactsRequest): Promise<SyncContactsResponse> => syncContacts(client, req),
    } as const;
  }
}
