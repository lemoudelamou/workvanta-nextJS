"use client";

import { useState, useTransition } from "react";
import { BellRing, CheckCheck, Inbox } from "lucide-react";

import type { NotificationView } from "@/lib/notifications/notification-feed";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./notifications-actions";
import { NotificationRow } from "./notification-row";

type Filter = "all" | "unread" | "mentions";

const GROUPS: NotificationView["group"][] = ["Today", "Yesterday", "Earlier"];

/** The full notifications list: filters, day groups and read state. */
export function NotificationsInbox({ initial }: { initial: NotificationView[] }) {
    const [items, setItems] = useState(initial);
    // New notifications arrive as fresh props after a live refresh.
    const [syncedFrom, setSyncedFrom] = useState(initial);
    if (syncedFrom !== initial) {
        setSyncedFrom(initial);
        setItems(initial);
    }
    const [filter, setFilter] = useState<Filter>("all");
    const [, startTransition] = useTransition();

    const unread = items.filter((n) => !n.read).length;
    const mentions = items.filter((n) => n.type === "MENTION").length;
    const shown = items.filter((n) =>
        filter === "unread" ? !n.read : filter === "mentions" ? n.type === "MENTION" : true,
    );

    function markRead(id: string) {
        setItems((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)));
        startTransition(async () => {
            await markNotificationReadAction(id);
        });
    }

    function markAllRead() {
        setItems((all) => all.map((n) => ({ ...n, read: true })));
        startTransition(async () => {
            await markAllNotificationsReadAction();
        });
    }

    const filters: { value: Filter; label: string; count?: number }[] = [
        { value: "all", label: "All" },
        { value: "unread", label: "Unread", count: unread },
        { value: "mentions", label: "Mentions", count: mentions },
    ];

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Show" className="flex rounded-full bg-foreground/[0.05] p-0.5">
                    {filters.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={filter === option.value}
                            onClick={() => setFilter(option.value)}
                            className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                                filter === option.value
                                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.1)] dark:bg-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {option.label}
                            {!!option.count && (
                                <span
                                    className={`min-w-5 rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums ${
                                        option.value === "unread"
                                            ? "bg-brand text-white dark:text-[#0f1115]"
                                            : "bg-foreground/10 text-muted-foreground"
                                    }`}
                                >
                                    {option.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {unread > 0 && (
                    <button
                        type="button"
                        onClick={markAllRead}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        <CheckCheck className="size-4" aria-hidden="true" />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-2 shadow-[0_1px_2px_rgba(23,26,33,0.04),0_8px_24px_-16px_rgba(23,26,33,0.12)] sm:p-3">
                {shown.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-14 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
                            {filter === "all" ? <Inbox className="size-5" aria-hidden="true" /> : <BellRing className="size-5" aria-hidden="true" />}
                        </span>
                        <h2 className="mt-4 text-base font-semibold text-foreground">
                            {filter === "unread" ? "You're all caught up" : filter === "mentions" ? "No mentions yet" : "Nothing here yet"}
                        </h2>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            {filter === "mentions"
                                ? "When someone @mentions you in a comment, it shows up here."
                                : "Assignments, comments on your tasks and mentions will show up here."}
                        </p>
                    </div>
                ) : (
                    GROUPS.map((group) => {
                        const rows = shown.filter((n) => n.group === group);
                        if (!rows.length) return null;
                        return (
                            <section key={group} aria-labelledby={`group-${group}`} className="[&+section]:mt-3">
                                <h2
                                    id={`group-${group}`}
                                    className="px-3 pb-1.5 pt-2 text-xs font-semibold text-muted-foreground sm:px-4"
                                >
                                    {group}
                                </h2>
                                <ul className="space-y-1">
                                    {rows.map((view) => (
                                        <li key={view.id}>
                                            <NotificationRow
                                                view={view}
                                                onOpen={() => !view.read && markRead(view.id)}
                                                onMarkRead={() => markRead(view.id)}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    })
                )}
            </div>
        </div>
    );
}
