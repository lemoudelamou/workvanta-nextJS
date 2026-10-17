"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { RealtimeChannel } from "ably";

import { getRealtime } from "@/lib/realtime/client";
import { userChannel } from "@/lib/realtime/channels";
import { affectsPage, createLiveRefresher, type TaskChanged } from "@/lib/realtime/live-refresh";

type NotificationCreated = { userId: string; notificationId: string };

type CommentCreated = {
    commentId: string;
    taskId: string;
    projectId: string;
    authorId: string;
};

function broadcast(name: string, detail: unknown) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function RealtimeProvider({ userId }: { userId: string }) {
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;

        let active = true;
        let channel: RealtimeChannel | null = null;
        const refresher = createLiveRefresher(() => router.refresh());

        const onNotification = (data: NotificationCreated) => {
            if (data.userId !== userId) return;
            router.refresh();
            broadcast("Workvanta:notification-created", data);
        };

        const onComment = (data: CommentCreated) => {
            broadcast("Workvanta:comment-created", data);

            // Show someone else's new comment right away when this task is open.
            if (
                data.authorId !== userId &&
                window.location.pathname.endsWith(`/tasks/${data.taskId}`)
            ) {
                router.refresh();
            }
        };

        // Teammates' task changes: refresh the board, list or task page that
        // shows them. The tab where you made the change already updated, but
        // your other tabs (not focused) should follow along.
        const onTaskChanged = (data: TaskChanged) => {
            if (data.actorId === userId && document.hasFocus()) return;
            if (!affectsPage(window.location.pathname, data)) return;
            broadcast("Workvanta:task-changed", data);
            refresher.schedule();
        };

        getRealtime()
            .then((client) => {
                if (!active || !client) return;

                channel = client.channels.get(userChannel(userId));
                void channel.subscribe("notification-created", (m) => onNotification(m.data));
                void channel.subscribe("comment-created", (m) => onComment(m.data));
                void channel.subscribe("task-changed", (m) => onTaskChanged(m.data));
            })
            .catch((error) => console.error("Failed to connect to realtime:", error));

        return () => {
            active = false;
            channel?.unsubscribe();
            refresher.dispose();
        };
    }, [userId, router]);

    return null;
}