"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, AtSign, Bell, CalendarClock, Check, MessageSquare, UserRoundPlus } from "lucide-react";

import type { NotificationView } from "@/lib/notifications/notification-feed";
import { DUE_TYPES } from "@/lib/notifications/notification-types";
import { projectDot } from "@/lib/navigation/project-color";
import { personColor } from "@/lib/ui/person-color";

const TYPE_BADGE: Record<string, { icon: typeof Bell; tone: string; label: string }> = {
    MENTION: { icon: AtSign, tone: "bg-brand text-white dark:text-[#0f1115]", label: "Mention" },
    TASK_COMMENTED: { icon: MessageSquare, tone: "bg-sky-500 text-white", label: "Comment" },
    TASK_ASSIGNED: { icon: UserRoundPlus, tone: "bg-status-done text-white", label: "Assigned" },
    TASK_DUE_SOON: { icon: CalendarClock, tone: "bg-amber-500 text-white", label: "Due soon" },
    TASK_OVERDUE: { icon: AlertTriangle, tone: "bg-danger text-white", label: "Overdue" },
};

/** Reminders show their own icon, large, in place of a face. */
const REMINDER_FACE: Record<string, string> = {
    TASK_DUE_SOON: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    TASK_OVERDUE: "bg-danger/12 text-danger",
};
const DEFAULT_BADGE = { icon: Bell, tone: "bg-muted-foreground text-white", label: "Update" };

function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function Face({ view, size }: { view: NotificationView; size: number }) {
    const badge = TYPE_BADGE[view.type] ?? DEFAULT_BADGE;
    const Icon = badge.icon;
    if (REMINDER_FACE[view.type]) {
        return (
            <span
                className={`flex shrink-0 items-center justify-center rounded-full ${REMINDER_FACE[view.type]}`}
                style={{ width: size, height: size }}
            >
                <Icon className={size > 36 ? "size-5" : "size-4"} aria-hidden="true" />
            </span>
        );
    }
    return (
        <span className="relative shrink-0" style={{ width: size, height: size }}>
            {view.actor ? (
                <span
                    className={`relative flex size-full items-center justify-center overflow-hidden rounded-full font-semibold ${personColor(view.actor.email)}`}
                    style={{ fontSize: Math.round(size * 0.36) }}
                >
                    {view.actor.image ? (
                        <Image src={view.actor.image} alt="" fill sizes={`${size}px`} className="object-cover" />
                    ) : (
                        initials(view.actor.name)
                    )}
                </span>
            ) : (
                <span className="flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bell className="size-4" aria-hidden="true" />
                </span>
            )}
            <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full ring-2 ring-card ${badge.tone}`}
            >
                <Icon className="size-2.5" strokeWidth={2.5} />
            </span>
        </span>
    );
}

/** One sentence: "Daghar Mourad mentioned you in Design pricing page". */
export function notificationSentence(view: NotificationView) {
    const who = view.actor?.name ?? "Someone";
    if (DUE_TYPES.has(view.type)) return `${view.taskTitle ?? "A task"} ${view.verb}`;
    if (view.type === "TASK_ASSIGNED") {
        return view.taskTitle ? `${who} assigned you ${view.taskTitle}` : `${who} assigned you a task`;
    }
    return view.taskTitle ? `${who} ${view.verb} ${view.taskTitle}` : `${who} ${view.verb} a task`;
}

export function NotificationRow({
    view,
    compact = false,
    onOpen,
    onMarkRead,
}: {
    view: NotificationView;
    /** Tighter layout for the bell menu. */
    compact?: boolean;
    /** Called when the row is followed (marks it read). */
    onOpen: () => void;
    /** Shows a "Mark as read" button for unread rows. */
    onMarkRead?: () => void;
}) {
    const who = view.actor?.name ?? "Someone";
    const unread = !view.read;
    const text = DUE_TYPES.has(view.type) ? (
        <>
            <span className="font-semibold text-foreground">{view.taskTitle ?? "A task"}</span>{" "}
            <span className={view.type === "TASK_OVERDUE" ? "font-medium text-danger" : "text-muted-foreground"}>{view.verb}</span>
        </>
    ) : (
        <>
            <span className="font-semibold text-foreground">{who}</span>{" "}
            <span className="text-muted-foreground">{view.type === "TASK_ASSIGNED" ? "assigned you" : view.verb}</span>{" "}
            <span className="font-semibold text-foreground">{view.taskTitle ?? "a task"}</span>
        </>
    );

    const body = (
        <>
            <Face view={view} size={compact ? 32 : 40} />
            <span className="min-w-0 flex-1">
                <span className={`block leading-5 ${compact ? "text-[13px]" : "text-sm"}`}>{text}</span>
                {view.snippet && (
                    <span
                        className={`mt-1.5 block rounded-lg border-l-2 border-border bg-muted/60 px-2.5 py-1.5 text-[13px] leading-5 text-foreground/80 dark:bg-white/[0.04] ${
                            compact ? "line-clamp-2" : "line-clamp-3"
                        }`}
                    >
                        {view.snippet}
                    </span>
                )}
                <span className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    {view.projectName && view.projectId && (
                        <span className="flex min-w-0 items-center gap-1.5">
                            <span aria-hidden="true" className={`size-2 shrink-0 rounded-[2px] ${projectDot(view.projectId)}`} />
                            <span className="truncate">{view.projectName}</span>
                        </span>
                    )}
                    <time dateTime={view.createdAt} className="shrink-0">
                        {view.timeLabel}
                    </time>
                </span>
            </span>
            {unread && (
                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
            )}
            {unread && <span className="sr-only">(unread)</span>}
        </>
    );

    const rowClass = `relative flex w-full items-start gap-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
        compact ? "px-4 py-3" : "rounded-xl px-3 py-3 sm:px-4"
    } ${unread ? "bg-brand-soft/50 hover:bg-brand-soft dark:bg-brand/[0.07] dark:hover:bg-brand/[0.12]" : "hover:bg-muted/60"}`;

    return (
        <div className="group/row relative">
            {view.href ? (
                <Link href={view.href} onClick={onOpen} className={rowClass}>
                    {body}
                </Link>
            ) : (
                <button type="button" onClick={onOpen} className={rowClass}>
                    {body}
                </button>
            )}
            {unread && onMarkRead && (
                <button
                    type="button"
                    onClick={onMarkRead}
                    aria-label={`Mark as read: ${notificationSentence(view)}`}
                    title="Mark as read"
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-card text-muted-foreground opacity-0 shadow-sm ring-1 ring-border outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover/row:opacity-100 [@media(hover:none)]:hidden"
                >
                    <Check className="size-3.5" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
