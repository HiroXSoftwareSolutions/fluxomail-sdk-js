const ALLOWED_PLANS = new Set<AudiencePlan>(['free', 'pro', 'unlimited', 'lifetime']);

export type AudiencePlan = 'free' | 'pro' | 'unlimited' | 'lifetime';

export interface AudienceRecord {
  readonly email: string;
  readonly name?: string | null;
  readonly plan?: string | null;
  readonly unsubscribed?: boolean | null;
  readonly categories?: ReadonlyArray<string | null | undefined> | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly updatedAt?: number | string | Date | null;
}

export interface NormalizedAudienceRecord {
  readonly email: string;
  readonly name?: string;
  readonly plan: AudiencePlan;
  readonly unsubscribed?: boolean;
  readonly categories?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly updatedAt?: number;
}

export interface AudienceExportPage<Data> {
  readonly rows: readonly Data[];
  readonly nextCursor: string | null;
}

export interface AudienceExporterOptions<Data, Context = unknown> {
  /** Shared secret token required in the `Authorization: Bearer <token>` header. */
  readonly authToken: string;
  /** Fetch a page of application rows. */
  readonly fetchPage: (ctx: Context, cursor: string | null) => Promise<AudienceExportPage<Data>>;
  /** Map a raw row into an Audience record. Return null/undefined to skip the row. */
  readonly mapRow: (row: Data) => AudienceRecord | null | undefined;
}

export class AudienceRecordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudienceRecordValidationError';
  }
}

export function normalizeAudienceRecord(input: AudienceRecord): NormalizedAudienceRecord {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new AudienceRecordValidationError('Audience record is missing a valid email address');
  }

  const plan = normalizePlan(input.plan);
  const name = normalizeOptionalString(input.name);
  const unsubscribed = input.unsubscribed === true;
  const categories = normalizeCategories(input.categories);
  const metadata = normalizeMetadata(input.metadata);
  const updatedAt = normalizeTimestamp(input.updatedAt);

  return {
    email,
    plan,
    name: name ?? undefined,
    unsubscribed: unsubscribed || undefined,
    categories: categories?.length ? categories : undefined,
    metadata,
    updatedAt,
  };
}

export function validateAudienceRecords(records: readonly AudienceRecord[]): NormalizedAudienceRecord[] {
  return records.map((record) => normalizeAudienceRecord(record));
}

export function createAudienceExport<Data, Context = unknown>(options: AudienceExporterOptions<Data, Context>) {
  const { authToken, fetchPage, mapRow } = options;
  if (!authToken || typeof authToken !== 'string') {
    throw new Error('authToken is required for createAudienceExport');
  }

  return async function audienceExportHandler(ctx: Context, request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
    }

    const header = request.headers.get('authorization') || '';
    if (!isAuthorized(header, authToken)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');

    try {
      const page = await fetchPage(ctx, cursor);
      const rows = Array.isArray(page?.rows) ? page.rows : [];
      const contacts: NormalizedAudienceRecord[] = [];
      for (const row of rows) {
        const mapped = mapRow(row);
        if (!mapped) continue;
        const normalized = normalizeAudienceRecord(mapped);
        contacts.push(normalized);
      }

      const body = {
        contacts,
        nextCursor: typeof page?.nextCursor === 'string' && page.nextCursor.length > 0 ? page.nextCursor : null,
      } as const;

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    } catch (error) {
      if (error instanceof AudienceRecordValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }
      throw error;
    }
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return null;
  return trimmed;
}

function normalizePlan(input: unknown): AudiencePlan {
  if (typeof input === 'string' && input) {
    const lower = input.trim().toLowerCase();
    if (ALLOWED_PLANS.has(lower as AudiencePlan)) {
      return lower as AudiencePlan;
    }
  }
  return 'free';
}

function normalizeOptionalString(input: unknown): string | null {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed || null;
  }
  return null;
}

function normalizeCategories(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized) continue;
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out.length ? out : undefined;
}

function normalizeMetadata(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  return input as Record<string, unknown>;
}

function normalizeTimestamp(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  if (input instanceof Date) {
    const ms = input.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof input === 'string' && input.trim()) {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
    const iso = Date.parse(input);
    if (!Number.isNaN(iso)) return iso;
  }
  return undefined;
}

function isAuthorized(header: string, token: string): boolean {
  const value = header.trim();
  if (!value.toLowerCase().startsWith('bearer ')) return false;
  const extracted = value.slice(7).trim();
  return extracted === token;
}
