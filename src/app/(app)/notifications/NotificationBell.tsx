"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";

import {
    markAllNotificationsReadAction,
    markNotificationReadAction,
} from "@/app/(app)/notifications/notifications-actions";
import {
    getNotificationText,
    getTaskUrl,
} from "@/lib/notifications/notification-utils";
import { getSocket } from "@/lib/socket/client";

export type BellNotification = {
    id: string;
    type: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
};

type NotificationBellProps = {
    unreadCount: number;
    notifications?: BellNotification[];
};

const NO_NOTIFICATIONS: BellNotification[] = [];

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-white/30";

const rowClass = `flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] ${focusRing} focus-visible:ring-inset`;

function formatNotificationDate(date: string | Date) {
    const value = new Date(date);

    const month = MONTHS[value.getUTCMonth()];
    const day = value.getUTCDate();
    const year = value.getUTCFullYear();

    const hours = value.getUTCHours();
    const minutes = String(value.getUTCMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 || 12;

    return `${month} ${day}, ${year} at ${hour}:${minutes} ${period}`;
}

export function NotificationBell({
                                     unreadCount: initialUnreadCount,
                                     notifications: initialNotifications = NO_NOTIFICATIONS,
                                 }: NotificationBellProps) {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<BellNotification[]>(initialNotifications);
    const [unread, setUnread] = useState(initialUnreadCount);
    const [isPending, startTransition] = useTransition();

    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // When the server sends fresh notifications (after router.refresh()),
    // reset local state during render instead of in an effect.
    const [syncedFrom, setSyncedFrom] = useState({
        notifications: initialNotifications,
        unreadCount: initialUnreadCount,
    });

    if (
        syncedFrom.notifications !== initialNotifications ||
        syncedFrom.unreadCount !== initialUnreadCount
    ) {
        setSyncedFrom({ notifications: initialNotifications, unreadCount: initialUnreadCount });
        setItems(initialNotifications);
        setUnread(initialUnreadCount);
    }

    useEffect(() => {
        let mounted = true;
        let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

        function handleNotificationCreated() {
            if (mounted) router.refresh();
        }

        async function connect() {
            try {
                socket = await getSocket();
                if (!mounted) return;
                socket.on("notification-created", handleNotificationCreated);
            } catch (error) {
                console.error("Failed to connect notification socket:", error);
            }
        }

        void connect();

        return () => {
            mounted = false;
            socket?.off("notification-created", handleNotificationCreated);
        };
    }, [router]);

    useEffect(() => {
        if (!open) return;

        function onPointerDown(event: PointerEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    function close() {
        setOpen(false);
    }

    function markRead(notification: BellNotification) {
        if (notification.readAt) return;

        setItems((current) =>
            current.map((item) =>
                item.id === notification.id ? { ...item, readAt: new Date() } : item,
            ),
        );
        setUnread((current) => Math.max(0, current - 1));

        startTransition(async () => {
            await markNotificationReadAction(notification.id);
        });
    }

    function markAllRead() {
        setItems((current) =>
            current.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })),
        );
        setUnread(0);

        startTransition(async () => {
            await markAllNotificationsReadAction();
        });
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={
                    unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
                }
                className={`relative flex size-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white/70 text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-950 motion-reduce:transition-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white ${focusRing}`}
            >
                <Bell className="size-4" />

                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-slate-950">
            {unread > 99 ? "99+" : unread}
          </span>
                )}
            </button>

            {open && (
                <div className="fixed inset-x-4 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-xl shadow-slate-950/10 backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 dark:border-white/[0.08] dark:bg-slate-950/95 dark:shadow-black/40">
                    <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/[0.08]">
                        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                            Notifications
                        </h2>

                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                disabled={isPending}
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-950 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
                            >
                                <CheckCheck className="size-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <Bell className="mx-auto size-5 text-slate-300 dark:text-slate-600" />
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                You&apos;re all caught up
                            </p>
                        </div>
                    ) : (
                        <ul
                            className={`max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-white/[0.05] ${
                                isPending ? "opacity-70" : ""
                            }`}
                        >
                            {items.map((notification) => {
                                const url = getTaskUrl(notification.data);

                                const content = (
                                    <>
                    <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                            notification.readAt ? "bg-transparent" : "bg-blue-500"
                        }`}
                    />

                                        <span className="min-w-0 flex-1">
                      <span
                          className={`block text-sm ${
                              notification.readAt
                                  ? "font-medium text-slate-600 dark:text-slate-300"
                                  : "font-semibold text-slate-950 dark:text-white"
                          }`}
                      >
                        {getNotificationText(notification.type)}
                      </span>

                      <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </span>
                                    </>
                                );

                                return (
                                    <li key={notification.id}>
                                        {url ? (
                                            <Link
                                                href={url}
                                                onClick={() => {
                                                    markRead(notification);
                                                    close();
                                                }}
                                                className={rowClass}
                                            >
                                                {content}
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => markRead(notification)}
                                                className={rowClass}
                                            >
                                                {content}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <Link
                        href="/notifications"
                        onClick={close}
                        className={`group flex items-center justify-center gap-1.5 border-t border-slate-200/70 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-950 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white ${focusRing} focus-visible:ring-inset`}
                    >
                        View all notifications
                        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </Link>
                </div>
            )}
        </div>
    );
}