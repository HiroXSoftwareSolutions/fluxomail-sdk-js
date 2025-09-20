import test from 'node:test';
import assert from 'node:assert/strict';
import { audience } from '../dist/index.js';

const { createAudienceExport, validateAudienceRecords, AudienceRecordValidationError } = audience;

const TEST_URL = 'https://example.com/audience-export';

function makeRequest({ token, cursor } = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;
  const url = cursor ? `${TEST_URL}?cursor=${encodeURIComponent(cursor)}` : TEST_URL;
  return new Request(url, { headers });
}

test('createAudienceExport rejects missing bearer token', async () => {
  const handler = createAudienceExport({
    authToken: 'super-secret',
    async fetchPage() {
      return { rows: [], nextCursor: null };
    },
    mapRow() {
      return { email: 'test@example.com' };
    },
  });

  const res = await handler({}, makeRequest());
  assert.equal(res.status, 401);
});

test('createAudienceExport normalizes rows and returns pagination cursor', async () => {
  const handler = createAudienceExport({
    authToken: 'super-secret',
    async fetchPage(_ctx, cursor) {
      return {
        rows: cursor ? [] : [
          { id: '1', email: 'User@One.Com', tier: 'Pro', tags: [' VIP ', 'beta', 'VIP'], lastSeen: '2024-01-01T00:00:00Z' },
        ],
        nextCursor: cursor ? null : 'cursor_2',
      };
    },
    mapRow(row) {
      return {
        email: row.email,
        name: 'User One',
        plan: row.tier,
        categories: row.tags,
        metadata: { id: row.id },
        updatedAt: row.lastSeen,
      };
    },
  });

  const res = await handler({}, makeRequest({ token: 'super-secret' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, {
    contacts: [
      {
        email: 'user@one.com',
        name: 'User One',
        plan: 'pro',
        categories: ['VIP', 'beta'],
        metadata: { id: '1' },
        updatedAt: 1704067200000,
      },
    ],
    nextCursor: 'cursor_2',
  });
});

test('createAudienceExport surfaces validation errors', async () => {
  const handler = createAudienceExport({
    authToken: 'token',
    async fetchPage() {
      return { rows: [{}], nextCursor: null };
    },
    mapRow() {
      return { email: 'not-an-email' };
    },
  });

  const res = await handler({}, makeRequest({ token: 'token' }));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.deepEqual(body, { error: 'Audience record is missing a valid email address' });
});

test('validateAudienceRecords normalizes plans and categories', () => {
  const [record] = validateAudienceRecords([
    {
      email: 'List@Example.com',
      plan: 'unknown',
      categories: ['  alpha ', null, 'beta', 'alpha'],
      updatedAt: new Date('2024-03-01T00:00:00Z'),
    },
  ]);

  assert.equal(record.email, 'list@example.com');
  assert.equal(record.plan, 'free');
  assert.deepEqual(record.categories, ['alpha', 'beta']);
  assert.equal(record.updatedAt, Date.parse('2024-03-01T00:00:00Z'));
});

test('normalizeAudienceRecord throws readable validation error', () => {
  assert.throws(() => {
    validateAudienceRecords([
      {
        email: '  ',
      },
    ]);
  }, AudienceRecordValidationError);
});
