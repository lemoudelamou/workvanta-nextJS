"use client";

import Link from "next/link";
import { useTransition } from "react";

import { markNotificationReadAction } from "@/app/(app)/notifications/notifications-actions";
import {
    getNotificationText,
    getTaskUrl,
} from "@/lib/notifications/notification-utils";

type NotificationItemProps = {
    id: string;
    type: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
});

export function NotificationItem({
                                     id,
                                     type,
                                     data,
                                     readAt,
                                     createdAt,
                                 }: NotificationItemProps) {
    const [isPending, startTransition] = useTransition();

    const taskUrl = getTaskUrl(data);
    const isUnread = !readAt;

    function markRead() {
        if (readAt) return;

        startTransition(async () => {
            await markNotificationReadAction(id);
        });
    }

    const content = (
        <div
            className={`p-5 transition ${
                isUnread ? "bg-muted/40" : "bg-background"
            } ${isPending ? "opacity-60" : "hover:bg-muted/30"}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className={`text-sm ${isUnread ? "font-medium" : ""}`}>
                        {getNotificationText(type)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(createdAt))}
                    </p>
                </div>

                {isUnread && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-foreground" />
                )}
            </div>
        </div>
    );

    if (taskUrl) {
        return (
            <Link
                href={taskUrl}
                onClick={markRead}
                className="block border-b last:border-b-0"
            >
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={markRead}
            className="block w-full border-b text-left last:border-b-0"
        >
            {content}
        </button>
    );
}