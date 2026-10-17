import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
}

const publisher = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
});

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

export async function publishRealtimeEvent(
    event: RealtimeEvent,
) {
    await publisher.publish(
        "Workvanta:realtime",
        JSON.stringify(event),
    );
}
