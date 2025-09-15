// Internal OpenAPI type aliases to gradually adopt codegen'd shapes
// without changing the public SDK surface yet.

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { paths, components } from '../gen/openapi-types.js'

export type OpenAPISendRequestBody = paths['/api/v1/emails/send']['post']['requestBody']['content']['application/json']
export type OpenAPISendResponseBody = paths['/api/v1/emails/send']['post']['responses'][200]['content']['application/json']

export type OpenAPIListEventsResponse = paths['/api/v1/events']['get']['responses'][200]['content']['application/json']
export type OpenAPITimelineResponse = paths['/api/v1/sends/{id}']['get']['responses'][200]['content']['application/json']

export type OpenAPIEventEnvelope = components['schemas']['EventEnvelope']

// Placeholder adapters (no runtime changes). Keep for future structural checks.
export function asOpenAPISendBody(body: Record<string, unknown>): OpenAPISendRequestBody { return body as any }
export function asOpenAPIListEvents<T = unknown>(resp: OpenAPIListEventsResponse): OpenAPIListEventsResponse { return resp }
export function asOpenAPITimeline(resp: OpenAPITimelineResponse): OpenAPITimelineResponse { return resp }

// Compile-time shape checks against public SDK types (best-effort, non-fatal)
// These ensure OpenAPI response includes fields our SDK expects.
type HasEventsArray<R> = R extends { events: any[] } ? true : false
type HasOptionalNextCursor<R> = R extends { nextCursor?: string | null } ? true : false
type _AssertListEventsHasEvents = HasEventsArray<components['schemas']['ListEventsResponse']>
type _AssertListEventsHasCursor = HasOptionalNextCursor<components['schemas']['ListEventsResponse']>
