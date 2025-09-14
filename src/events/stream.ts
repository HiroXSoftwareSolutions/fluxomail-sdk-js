import type { EventHandler, SubscribeOptions, Subscription } from '../core/types.js';
import type { HttpClient } from '../core/http.js';

function isNode(): boolean {
  return typeof process !== 'undefined' && !!(process.release && process.release.name === 'node');
}

function jitteredBackoff(attempt: number, base = 250, cap = 2000): number {
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  return Math.floor(exp / 2 + Math.random() * exp / 2);
}

export function subscribe<T = unknown>(client: HttpClient, opts: SubscribeOptions = {}, onEvent: EventHandler<T>): Subscription {
  let closed = false;
  let es: EventSource | null = null;
  let attempt = 0;
  let latestSince = opts.since;
  const controller = new AbortController();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const start = async () => {
    if (closed || controller.signal.aborted) return;
    // Load checkpoint if provided and no explicit since
    if (!latestSince && opts.checkpoint) {
      try { latestSince = await opts.checkpoint.get(); } catch {}
    }
    const url = new URL(client.base() + '/events/stream');
    if (opts.types) for (const t of opts.types) url.searchParams.append('types', t);
    if (latestSince) url.searchParams.set('since', latestSince);
    let token = client.tokenParam();
    if (opts.getToken) {
      try { token = (await opts.getToken()) || token; } catch {}
    }
    if (token) url.searchParams.set('token', token);

    let EventSourceImpl: any = (globalThis as any).EventSource;
    if (isNode()) {
      const mod = await import('eventsource');
      EventSourceImpl = (mod as unknown as { default?: typeof EventSource; EventSource?: typeof EventSource }).default
        ?? (mod as unknown as { EventSource?: typeof EventSource }).EventSource;
      if (!EventSourceImpl) throw new Error('EventSource polyfill not available');
      es = new (EventSourceImpl as any)(url.toString(), {
        // @ts-expect-error NodeEventSource supports headers, but TS may not recognize on EventSource type
        headers: { Accept: 'text/event-stream' },
      }) as unknown as EventSource;
    /* c8 ignore start */
    } else {
      es = new (EventSourceImpl as any)(url.toString());
    }
    /* c8 ignore stop */

    es.onmessage = (ev) => {
      try {
        const data = ev.data ? JSON.parse(ev.data) : undefined;
        const id = (ev as MessageEvent & { lastEventId?: string }).lastEventId ?? undefined;
        if (id) latestSince = id;
        onEvent(data);
        if (id && opts.checkpoint) { try { void opts.checkpoint.set(id); } catch {} }
        attempt = 0; // reset backoff on success
      /* c8 ignore start */
      } catch {
        // ignore parse errors
      }
      /* c8 ignore stop */
    };

    es.onerror = () => {
      if (closed || controller.signal.aborted) return;
      es?.close();
      const wait = jitteredBackoff(attempt++);
      setTimeout(start, wait);
    };
  };

  void start();

  return {
    close() {
      closed = true;
      es?.close();
      controller.abort();
    },
  };
}
