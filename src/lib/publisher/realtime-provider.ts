"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSocket } from "@/lib/socket/client";

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
        let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

        const onNotification = (data: NotificationCreated) => {
            if (data.userId !== userId) return;
            router.refresh();
            broadcast("Workvanta:notification-created", data);
        };

        const onComment = (data: CommentCreated) => {
            broadcast("Workvanta:comment-created", data);
        };

        getSocket()
            .then((s) => {
                if (!active) return;

                socket = s;
                s.on("notification-created", onNotification);
                s.on("comment-created", onComment);
            })
            .catch((error) => console.error("Failed to initialize realtime socket:", error));

        return () => {
            active = false;
            socket?.off("notification-created", onNotification);
            socket?.off("comment-created", onComment);
        };
    }, [userId, router]);

    return null;
}