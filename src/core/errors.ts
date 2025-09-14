export class FluxomailError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(message: string, options: { code?: string; status?: number; requestId?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'FluxomailError';
    this.code = options.code ?? 'unknown_error';
    this.status = options.status ?? 0;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export class AuthError extends FluxomailError {
  constructor(message = 'Authentication failed', options: { requestId?: string } = {}) {
    super(message, { code: 'auth_error', status: 401, requestId: options.requestId });
    this.name = 'AuthError';
  }
}

export class PermissionDeniedError extends FluxomailError {
  constructor(message = 'Permission denied', options: { requestId?: string } = {}) {
    super(message, { code: 'permission_denied', status: 403, requestId: options.requestId });
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends FluxomailError {
  constructor(message = 'Resource not found', options: { requestId?: string } = {}) {
    super(message, { code: 'not_found', status: 404, requestId: options.requestId });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends FluxomailError {
  retryAfterMs?: number;
  constructor(message = 'Rate limited', options: { requestId?: string; retryAfterMs?: number } = {}) {
    super(message, { code: 'rate_limited', status: 429, requestId: options.requestId });
    this.name = 'RateLimitError';
    this.retryAfterMs = options.retryAfterMs;
  }
}

export class ValidationError extends FluxomailError {
  constructor(message = 'Validation error', options: { requestId?: string; details?: unknown } = {}) {
    super(message, { code: 'validation_error', status: 422, requestId: options.requestId, details: options.details });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends FluxomailError {
  constructor(message = 'Network error') {
    super(message, { code: 'network_error' });
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends FluxomailError {
  constructor(message = 'Request timed out') {
    super(message, { code: 'timeout' });
    this.name = 'TimeoutError';
  }
}

export function classifyHttpError(status: number, body: unknown, requestId?: string): FluxomailError {
  // Attempt to parse an error envelope with code/message
  const asObj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined;
  const code = (asObj?.code as string | undefined) ?? undefined;
  const message = (asObj?.message as string | undefined) ?? undefined;

  if (status === 401) return new AuthError(message ?? 'Authentication failed', { requestId });
  if (status === 403) return new PermissionDeniedError(message ?? 'Permission denied', { requestId });
  if (status === 404) return new NotFoundError(message ?? 'Not found', { requestId });
  if (status === 422) return new ValidationError(message ?? 'Validation error', { requestId, details: asObj?.details });
  if (status === 429) return new RateLimitError(message ?? 'Rate limited', { requestId });

  const err = new FluxomailError(message ?? 'Request failed', { code: code ?? 'http_error', status, requestId, details: body });
  return err;
}
