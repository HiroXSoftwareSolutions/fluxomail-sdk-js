import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHttpError, AuthError, PermissionDeniedError, NotFoundError, ValidationError, RateLimitError, FluxomailError } from '../dist/index.js';

test('classifyHttpError maps status codes', () => {
  assert.ok(classifyHttpError(401, {}) instanceof AuthError);
  assert.ok(classifyHttpError(403, {}) instanceof PermissionDeniedError);
  assert.ok(classifyHttpError(404, {}) instanceof NotFoundError);
  assert.ok(classifyHttpError(422, {}) instanceof ValidationError);
  assert.ok(classifyHttpError(429, {}) instanceof RateLimitError);
  const e = classifyHttpError(500, { error: 'boom' });
  assert.ok(e instanceof FluxomailError);
});

