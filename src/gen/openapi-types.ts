export interface paths {
    "/api/v1/emails/send": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Send an email */
        post: {
            parameters: {
                query?: never;
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        to: string;
                        subject: string;
                        /** @description Plain text or HTML; field names may vary by backend */
                        content: string;
                        htmlContent?: string;
                        policyKey?: string;
                        cc?: string | string[];
                        bcc?: string | string[];
                        attachments?: {
                            filename: string;
                            contentBase64: string;
                            contentType?: string;
                        }[];
                    };
                };
            };
            responses: {
                /** @description Send accepted */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        "Idempotency-Key"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            sendId?: string;
                            status?: string;
                        };
                    };
                };
                401: components["responses"]["Unauthorized"];
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/emails/send-global": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Send an email via the global endpoint */
        post: {
            parameters: {
                query?: never;
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        to: string;
                        subject: string;
                        /** @description Plain text body */
                        content: string;
                        htmlContent?: string;
                        policyKey?: string;
                    };
                };
            };
            responses: {
                /** @description Send accepted */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        "Idempotency-Key"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            sendId?: string;
                            status?: string;
                        };
                    };
                };
                401: components["responses"]["Unauthorized"];
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contacts/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sync contacts (batch or realtime deltas)
         * @description Upsert contacts with metadata, plan and subscription state.
         *     Use either `Idempotency-Key` per request or provide `eventId` on every contact row.
         */
        post: {
            parameters: {
                query?: never;
                header?: {
                    "Idempotency-Key"?: string;
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example stripe */
                        source?: string;
                        contacts: {
                            /** Format: email */
                            email: string;
                            externalId?: string;
                            name?: string;
                            /** @enum {string} */
                            plan?: "free" | "pro" | "unlimited" | "lifetime";
                            subscribed?: boolean;
                            deleted?: boolean;
                            state?: string;
                            sourceUpdatedAt?: number | string;
                            planStartedAt?: number | string;
                            planEndsAt?: number | string;
                            categories?: string[];
                            metadata?: {
                                [key: string]: unknown;
                            };
                            eventId?: string;
                        }[];
                    };
                };
            };
            responses: {
                /** @description Sync summary */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        "Idempotency-Key"?: string;
                        "Idempotency-Replayed"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            ok?: boolean;
                            source?: string;
                            processed?: number;
                            created?: number;
                            updated?: number;
                            failed?: number;
                            skippedStale?: number;
                            skippedDuplicate?: number;
                            unsubscribed?: number;
                            resubscribed?: number;
                        };
                    };
                };
                /** @description Validation or idempotency requirements not met */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                401: components["responses"]["Unauthorized"];
                /** @description Missing required scope (contacts_write) */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Idempotency key payload conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sends/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get send status/timeline */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    /** @description ms epoch or ISO datetime for paging older timeline entries */
                    cursor?: string;
                };
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Timeline */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            send?: {
                                [key: string]: unknown;
                            };
                            messages?: {
                                [key: string]: unknown;
                            }[];
                            events: components["schemas"]["EventEnvelope"][];
                            rawEvents?: {
                                [key: string]: unknown;
                            }[];
                            nextCursor?: string | null;
                        };
                    };
                };
                401: components["responses"]["Unauthorized"];
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                429: components["responses"]["RateLimited"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List events */
        get: {
            parameters: {
                query?: {
                    types?: string[];
                    limit?: number;
                    /** @description Opaque cursor or ms epoch for backward paging */
                    cursor?: string;
                    /** @description ISO timestamp or ms epoch for lower bound */
                    since?: string;
                    /** @description SMTP response code filter (e.g. 250, 550) */
                    smtpCode?: string;
                    /** @description Remote MTA hostname filter */
                    mtaHost?: string;
                    /** @description Recipient domain filter (e.g. gmail.com) */
                    domain?: string;
                };
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Event page */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        "X-RateLimit-Limit"?: string;
                        "X-RateLimit-Remaining"?: string;
                        "X-RateLimit-Reset"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ListEventsResponse"];
                    };
                };
                401: components["responses"]["Unauthorized"];
                /** @description Plan required (Events API not enabled) */
                402: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                429: components["responses"]["RateLimited"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Realtime event stream (SSE)
         * @description Server-Sent Events stream of event envelopes.
         *     Browser clients may pass `token` as a query parameter instead of Authorization header.
         */
        get: {
            parameters: {
                query?: {
                    types?: string[];
                    since?: string;
                    /** @description Short‑lived browser token (alternative to Authorization) */
                    token?: string;
                    /** @description SMTP response code filter (e.g. 250, 550) */
                    smtpCode?: string;
                    /** @description Remote MTA hostname filter */
                    mtaHost?: string;
                    /** @description Recipient domain filter (e.g. gmail.com) */
                    domain?: string;
                };
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description text/event-stream payload */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        /** @example text/event-stream; charset=utf-8 */
                        "Content-Type"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "text/event-stream": string;
                    };
                };
                401: components["responses"]["Unauthorized"];
                /** @description Plan required (Events API not enabled) */
                402: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                429: components["responses"]["RateLimited"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get aggregated transactional metrics */
        get: {
            parameters: {
                query?: {
                    window?: "24h" | "7d" | "30d" | "all";
                    /** @description Optional lower bound (ms epoch or ISO datetime). Overrides `window` when present. */
                    since?: string;
                };
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Aggregated metrics */
                200: {
                    headers: {
                        "Fluxomail-Request-Id"?: string;
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetricsResponse"];
                    };
                };
                401: components["responses"]["Unauthorized"];
                /** @description Missing required scope (read_sends) */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                429: components["responses"]["RateLimited"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get contact preferences */
        get: {
            parameters: {
                query?: {
                    /** @description Unsubscribe token for contact identification */
                    token?: string;
                    /** @description Contact email (alternative to token) */
                    email?: string;
                };
                header?: {
                    /** @description Date-based version pin, e.g., 2025-09-01. */
                    "Fluxomail-Version"?: components["parameters"]["FluxomailVersion"];
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Contact preferences payload */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            contact: {
                                id?: string;
                                email?: string;
                            };
                            categories: {
                                [key: string]: unknown;
                            }[];
                            subscriptions: {
                                [key: string]: unknown;
                            }[];
                        };
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Update contact preferences */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        token?: string;
                        email?: string;
                        subscriptions?: {
                            categoryKey: string;
                            subscribed: boolean;
                        }[];
                    };
                };
            };
            responses: {
                /** @description Preferences updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            ok?: boolean;
                        };
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        EventEnvelope: {
            id: string;
            /** @example email.delivered */
            type: string;
            /** Format: date-time */
            created: string;
            data: {
                [key: string]: unknown;
            };
        };
        ListEventsResponse: {
            events: components["schemas"]["EventEnvelope"][];
            nextCursor?: string | null;
        };
        MetricsResponse: {
            window: {
                /** @enum {string} */
                preset: "24h" | "7d" | "30d" | "all";
                /** Format: date-time */
                since: string;
                /** Format: date-time */
                until: string;
            };
            scanned: {
                sends?: number;
                sendScanLimit?: number;
            };
            metrics: {
                [key: string]: unknown;
            };
        };
    };
    responses: {
        /** @description Invalid or missing API key */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    code?: string;
                    message?: string;
                };
            };
        };
        /** @description Rate limit exceeded */
        RateLimited: {
            headers: {
                /** @description Seconds to wait before retry */
                "Retry-After"?: string;
                "X-RateLimit-Limit"?: string;
                "X-RateLimit-Remaining"?: string;
                "X-RateLimit-Reset"?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    code?: string;
                    message?: string;
                };
            };
        };
    };
    parameters: {
        /** @description Date-based version pin, e.g., 2025-09-01. */
        FluxomailVersion: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
