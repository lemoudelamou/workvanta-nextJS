"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

const UTC = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
});

/**
 * A timestamp in the reader's own time zone. The server doesn't know it, so
 * the first render (server and hydration) uses UTC and the browser swaps in
 * local time right after, without a hydration mismatch.
 */
export function LocalTime({ date, className }: { date: Date | string; className?: string }) {
    const hydrated = useSyncExternalStore(noop, () => true, () => false);
    const value = new Date(date);

    const text = hydrated
        ? value.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: value.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
              hour: "numeric",
              minute: "2-digit",
          })
        : `${UTC.format(value)} UTC`;

    return (
        <time dateTime={value.toISOString()} className={className}>
            {text}
        </time>
    );
}
