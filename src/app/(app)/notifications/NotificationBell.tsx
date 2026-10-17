"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";

import {
    markAllNotificationsReadAction,
    markNotificationReadAction,
} from "@/app/(app)/notifications/notifications-actions";
import type { NotificationView } from "@/lib/notifications/notification-feed";
import { NotificationRow } from "./notification-row";
import { getSocket } from "@/lib/socket/client";

export type BellNotification = NotificationView;

type NotificationBellProps = {
    unreadCount: number;
    notifications?: BellNotification[];
};

const NO_NOTIFICATIONS: BellNotification[] = [];

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
        if (notification.read) return;

        setItems((current) =>
            current.map((item) =>
                item.id === notification.id ? { ...item, read: true } : item,
            ),
        );
        setUnread((current) => Math.max(0, current - 1));

        startTransition(async () => {
            await markNotificationReadAction(notification.id);
        });
    }

    function markAllRead() {
        setItems((current) =>
            current.map((item) => ({ ...item, read: true })),
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
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
            >
                <Bell className="size-[18px]" />
                {unread > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background dark:text-[#0f1115]">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed inset-x-3 top-[3.75rem] z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_64px_-12px_rgba(15,17,21,0.35)] motion-safe:animate-[shell-pop_140ms_ease-out] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px]">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            Notifications
                            {unread > 0 && (
                                <span className="rounded-full bg-brand px-1.5 text-[11px] leading-[18px] text-white dark:text-[#0f1115]">
                                    {unread} new
                                </span>
                            )}
                        </h2>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                            >
                                <CheckCheck className="size-3.5" aria-hidden="true" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <Bell className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                            <p className="mt-2 text-sm text-muted-foreground">You&apos;re all caught up</p>
                        </div>
                    ) : (
                        <ul className={`max-h-[min(60vh,420px)] divide-y divide-border overflow-y-auto ${isPending ? "opacity-70" : ""}`}>
                            {items.map((notification) => (
                                <li key={notification.id}>
                                    <NotificationRow
                                        view={notification}
                                        compact
                                        onOpen={() => {
                                            markRead(notification);
                                            if (notification.href) close();
                                        }}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}

                    <Link
                        href="/notifications"
                        onClick={close}
                        className="group flex items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                    >
                        View all notifications
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                    </Link>
                </div>
            )}
        </div>
    );
}
