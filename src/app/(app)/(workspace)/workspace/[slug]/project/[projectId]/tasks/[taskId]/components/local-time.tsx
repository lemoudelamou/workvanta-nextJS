"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during the server render and hydration, true afterwards. */
export function useHydrated() {
    return useSyncExternalStore(noop, () => true, () => false);
}

const UTC_TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const UTC_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * The server doesn't know the reader's time zone, so the first render
 * (server and hydration) uses UTC and the browser swaps in local time right
 * after, without a hydration mismatch.
 */
export function formatTime(date: Date, hydrated: boolean) {
    return hydrated
        ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : `${UTC_TIME.format(date)} UTC`;
}

/** "Today", "Yesterday", "Mon, Oct 12" or "Oct 12, 2025". */
export function formatDayLabel(date: Date, hydrated: boolean) {
    if (!hydrated) return UTC_DAY.format(date);
    const today = new Date();
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", {
        weekday: diff < 7 ? "short" : undefined,
        month: "short",
        day: "numeric",
        year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    });
}

export function dayKey(date: Date, hydrated: boolean) {
    return hydrated ? date.toDateString() : date.toISOString().slice(0, 10);
}

export function LocalTime({ date, className }: { date: Date | string; className?: string }) {
    const hydrated = useHydrated();
    const value = new Date(date);
    return (
        <time
            dateTime={value.toISOString()}
            title={hydrated ? value.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : undefined}
            className={className}
        >
            {formatTime(value, hydrated)}
        </time>
    );
}
