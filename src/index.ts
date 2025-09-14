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
} from './core/types.js';

import { HttpClient } from './core/http.js';
import { listEvents } from './events/list.js';
import { subscribe } from './events/stream.js';
import { sendEmail } from './sends/send.js';
import { getTimeline } from './timelines/get.js';

export * from './core/errors.js';
export * from './core/types.js';

export class Fluxomail {
  private readonly client: HttpClient;

  constructor(cfg: ClientConfig = {}) {
    this.client = new HttpClient(cfg);
  }

  get events() {
    const client = this.client;
    return {
      list: <T = unknown>(opts: ListEventsOptions = {}): Promise<ListEventsResponse<T>> => listEvents<T>(client, opts),
      subscribe: <T = unknown>(opts: SubscribeOptions, onEvent: EventHandler<T>): Subscription => subscribe<T>(client, opts, onEvent),
    } as const;
  }

  get sends() {
    const client = this.client;
    return {
      send: (req: SendEmailRequest): Promise<SendEmailResponse> => sendEmail(client, req),
    } as const;
  }

  get timelines() {
    const client = this.client;
    return {
      get: <T = unknown>(opts: GetTimelineOptions): Promise<GetTimelineResponse<T>> => getTimeline<T>(client, opts),
    } as const;
  }
}
