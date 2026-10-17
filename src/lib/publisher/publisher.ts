import { ablyRest } from "@/lib/realtime/ably";
import { userChannel } from "@/lib/realtime/channels";

export type RealtimeEvent =
    | {
    type: "comment-created";
    workspaceId: string;
    /** Only these users receive the event: people who can open the project. */
    recipientIds: string[];
    data: {
        commentId: string;
        taskId: string;
        projectId: string;
        authorId: string;
    };
}
    | {
    type: "task-changed";
    workspaceId: string;
    /** Only these users receive the event: people who can open the project. */
    recipientIds: string[];
    data: {
        projectId: string;
        taskId: string | null;
        kind: string;
        /** Who made the change, so their own tab can skip the refresh. */
        actorId: string | null;
    };
}
    | {
    type: "notification-created";
    workspaceId: string;
    data: {
        userId: string;
        notificationId: string;
    };
}
    | {
    type: "workspace-access-revoked";
    workspaceId: string;
    data: {
        userId: string;
    };
};

/** Who receives an event: project events name their audience; the rest name one user. */
function recipientsOf(event: RealtimeEvent) {
    const ids = "recipientIds" in event ? event.recipientIds : [event.data.userId];
    return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

// Ably's batch publish takes up to 100 channels at a time.
const BATCH = 100;

/**
 * Sends an event to each recipient's private channel. A no-op when realtime
 * is off (no ABLY_API_KEY).
 */
export async function publishRealtimeEvent(event: RealtimeEvent) {
    const ably = ablyRest();
    if (!ably) return;

    const channels = recipientsOf(event).map(userChannel);
    for (let i = 0; i < channels.length; i += BATCH) {
        await ably.batchPublish({
            channels: channels.slice(i, i + BATCH),
            messages: [{ name: event.type, data: event.data }],
        });
    }
}
