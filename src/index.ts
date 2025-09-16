import type {
  ClientConfig,
  ListEventsOptions,
  ListEventsResponse,
  SubscribeOptions,
  EventHandler,
  Subscription,
  SendEmailRequest,
  SendEmailResponse,
  GetTimelineOptions,
  GetTimelineResponse,
  EmailEventType,
  EmailEventEnvelope,
} from './core/types.js';

import { HttpClient } from './core/http.js';
import { listEvents, listEventsWithMeta } from './events/list.js';
import { subscribe } from './events/stream.js';
import { iterateEvents } from './events/iterate.js';
import { sendEmail, sendEmailWithMeta } from './sends/send.js';
import { getTimeline, getTimelineWithMeta } from './timelines/get.js';
import { iterateTimeline } from './timelines/iterate.js';
import { createTemplate, getTemplate, listTemplates, updateTemplate, deleteTemplate, renderTemplate } from './templates/index.js';
export * as webhooks from './webhooks/index.js';

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

  get sends() {
    const client = this.client;
    return {
      send: (req: SendEmailRequest): Promise<SendEmailResponse> => sendEmail(client, req),
      sendWithMeta: (req: SendEmailRequest) => sendEmailWithMeta(client, req),
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

  get templates() {
    const client = this.client;
    return {
      create: (req: import('./core/types.js').CreateTemplateRequest) => createTemplate(client, req),
      get: (id: string, opts: { signal?: AbortSignal; timeoutMs?: number } = {}) => getTemplate(client, id, opts),
      list: (opts: import('./core/types.js').ListTemplatesOptions = {}) => listTemplates(client, opts),
      update: (id: string, req: import('./core/types.js').UpdateTemplateRequest) => updateTemplate(client, id, req),
      delete: (id: string, opts: { signal?: AbortSignal; timeoutMs?: number } = {}) => deleteTemplate(client, id, opts),
      render: (id: string, req: import('./core/types.js').RenderTemplateRequest) => renderTemplate(client, id, req),
    } as const;
  }
}
