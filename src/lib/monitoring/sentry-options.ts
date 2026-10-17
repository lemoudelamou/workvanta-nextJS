/**
 * Error tracking with Sentry, shared by the server, edge and browser setups.
 * Off unless NEXT_PUBLIC_SENTRY_DSN is set (a DSN is public by design: it
 * only lets you send events). Errors only: no tracing or session replay, so
 * it stays within Sentry's free plan, and no personal data is attached.
 */
export const sentryOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
};
