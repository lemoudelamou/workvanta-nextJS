import "dotenv/config";

import { createServer } from "node:http";

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";

import { prisma } from "@/lib/db/prisma-client";
import { verifySocketToken } from "@/lib/socket/token";


const PORT = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3001);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const REALTIME_CHANNEL = "Workvanta:realtime";
const MAX_IDLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is not defined");


const userRoom = (userId: string) => `user:${userId}`;
const sessionRoom = (sessionId: string) => `session:${sessionId}`;
const workspaceRoom = (workspaceId: string) => `workspace:${workspaceId}`;


const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const subClient = pubClient.duplicate();
const realtimeSubscriber = new IORedis(redisUrl, { maxRetriesPerRequest: null });

for (const [name, client] of [
    ["pub", pubClient],
    ["sub", subClient],
    ["realtime", realtimeSubscriber],
] as const) {
    client.on("error", (error) => {
        console.error(`Redis ${name} client error:`, error);
    });
}


const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "workvanta-socket" }));
        return;
    }

    res.writeHead(404);
    res.end("Not Found");
});

const io = new Server(httpServer, {
    cors: { origin: APP_URL, credentials: true },
});

io.adapter(createAdapter(pubClient, subClient));

io.use(async (socket, next) => {
    const reject = () => next(new Error("Authentication required"));

    try {
        const token = socket.handshake.auth?.token;

        if (typeof token !== "string" || !token) {
            console.warn("Socket rejected: missing token", socket.id);
            return reject();
        }

        const tokenData = verifySocketToken(token);

        if (!tokenData) {
            console.warn("Socket rejected: invalid token", socket.id);
            return reject();
        }

        const session = await prisma.session.findUnique({
            where: { id: tokenData.sessionId },
            select: {
                id: true,
                userId: true,
                expiresAt: true,
                lastUsedAt: true,
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        });

        if (!session) return reject();

        const now = Date.now();
        const expired = session.expiresAt.getTime() <= now;
        const idleTooLong = now - session.lastUsedAt.getTime() > MAX_IDLE_MS;

        if (expired || idleTooLong) {
            // Clean up the dead session so it can't be reused.
            await prisma.session.deleteMany({ where: { id: session.id } });
            return reject();
        }

        socket.data.userId = session.userId;
        socket.data.sessionId = session.id;
        socket.data.user = session.user;

        next();
    } catch (error) {
        console.error("Socket authentication failed:", error);
        next(new Error("Socket authentication failed"));
    }
});


io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    const sessionId = socket.data.sessionId as string | undefined;

    if (!userId || !sessionId) {
        console.error("Authenticated socket is missing identity:", socket.id);
        socket.disconnect(true);
        return;
    }

    console.log("Socket connected:", socket.id, "user:", userId);

    socket.join(userRoom(userId));
    socket.join(sessionRoom(sessionId));

    socket.on("join-workspace", async (workspaceId: unknown) => {
        if (typeof workspaceId !== "string" || !workspaceId.trim()) {
            socket.emit("workspace-join-error", {
                workspaceId,
                message: "Invalid workspace ID",
            });
            return;
        }

        const id = workspaceId.trim();

        try {
            const membership = await prisma.workspaceMember.findFirst({
                where: { workspaceId: id, userId },
                select: { id: true },
            });

            if (!membership) {
                console.warn("Unauthorized workspace join attempt:", {
                    socketId: socket.id,
                    userId,
                    workspaceId: id,
                });

                socket.emit("workspace-join-error", {
                    workspaceId: id,
                    message: "You are not a member of this workspace",
                });
                return;
            }

            socket.join(workspaceRoom(id));
            socket.emit("workspace-joined", { workspaceId: id });
        } catch (error) {
            console.error("Workspace join failed:", error);

            socket.emit("workspace-join-error", {
                workspaceId: id,
                message: "Unable to join workspace",
            });
        }
    });

    socket.on("leave-workspace", (workspaceId: unknown) => {
        if (typeof workspaceId !== "string") return;

        const id = workspaceId.trim();
        if (!id) return;

        socket.leave(workspaceRoom(id));
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", socket.id, "user:", userId, "reason:", reason);
    });
});

type RealtimeEvent = {
    type:
        | "comment-created"
        | "task-changed"
        | "notification-created"
        | "workspace-access-revoked"
        | "session-revoked";
    workspaceId?: string;
    recipientIds?: string[];
    data: {
        userId?: string;
        sessionId?: string;
        notificationId?: string;
        commentId?: string;
        taskId?: string;
        projectId?: string;
        authorId?: string;
        kind?: string;
        actorId?: string | null;
    };
};

/** User ids an event is addressed to, ignoring anything malformed. */
function recipientsOf(event: RealtimeEvent) {
    return Array.isArray(event.recipientIds)
        ? event.recipientIds.filter((id): id is string => typeof id === "string" && id.length > 0)
        : [];
}

function handleRealtimeMessage(channel: string, message: string) {
    if (channel !== REALTIME_CHANNEL) return;

    let event: RealtimeEvent;

    try {
        event = JSON.parse(message) as RealtimeEvent;
    } catch (error) {
        console.error("Failed to parse realtime event:", error);
        return;
    }

    switch (event.type) {
        case "comment-created":
        case "task-changed": {
            // Delivered per user, never to the whole workspace: private
            // projects must not leak activity to people who can't open them.
            const recipients = recipientsOf(event);

            if (recipients.length === 0) {
                console.error(`${event.type} event has no recipients:`, event);
                return;
            }

            io.to(recipients.map(userRoom)).emit(event.type, event.data);
            return;
        }

        case "notification-created": {
            const targetUserId = event.data.userId;

            if (!targetUserId) {
                console.error("Notification event is missing userId:", event.data);
                return;
            }

            io.to(userRoom(targetUserId)).emit("notification-created", event.data);
            return;
        }

        case "workspace-access-revoked": {
            const targetUserId = event.data.userId;

            if (!event.workspaceId || !targetUserId) {
                console.error("Access-revoked event is missing fields:", event);
                return;
            }

            io.to(userRoom(targetUserId)).emit("workspace-access-revoked", {
                workspaceId: event.workspaceId,
            });

            io.in(userRoom(targetUserId)).socketsLeave(workspaceRoom(event.workspaceId));
            return;
        }

        case "session-revoked": {
            const targetSessionId = event.data.sessionId;

            if (!targetSessionId) {
                console.error("Session-revoked event is missing sessionId:", event);
                return;
            }

            io.to(sessionRoom(targetSessionId)).emit("session-revoked");
            io.in(sessionRoom(targetSessionId)).disconnectSockets(true);
            return;
        }

        default:
            console.warn("Unknown realtime event type:", event);
    }
}

async function startRealtimeSubscriber() {
    realtimeSubscriber.on("message", handleRealtimeMessage);

    try {
        await realtimeSubscriber.subscribe(REALTIME_CHANNEL);
        console.log(`Subscribed to ${REALTIME_CHANNEL}`);
    } catch (error) {
        console.error(`Failed to subscribe to ${REALTIME_CHANNEL}:`, error);
        throw error;
    }
}

async function startServer() {
    try {
        await startRealtimeSubscriber();

        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`Workvanta Socket.IO server running on port ${PORT}`);
            console.log(`Socket CORS origin: ${APP_URL}`);
        });
    } catch (error) {
        console.error("Failed to start Workvanta Socket.IO server:", error);
        process.exit(1);
    }
}

let isShuttingDown = false;

async function shutdown(signal: string) {
    if (isShuttingDown) {
        console.log(`Shutdown already in progress. Ignoring ${signal}.`);
        return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Shutting down Socket.IO server...`);

    await new Promise<void>((resolve) => io.close(() => resolve()));

    await Promise.allSettled([
        realtimeSubscriber.quit(),
        subClient.quit(),
        pubClient.quit(),
        prisma.$disconnect(),
    ]);

    console.log("Socket.IO server shut down cleanly.");
    process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

void startServer();