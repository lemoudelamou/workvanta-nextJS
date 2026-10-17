import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/monitoring/sentry-options";

export function register() {
    Sentry.init(sentryOptions);
}

/** Server errors (pages, server actions, route handlers) go to Sentry. */
export const onRequestError = Sentry.captureRequestError;
