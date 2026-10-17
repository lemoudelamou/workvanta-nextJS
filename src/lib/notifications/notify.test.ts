import { notifyTaskDone } from "./notify";
import { prisma } from "@/lib/db/prisma";
import { createNotification, sendNotificationEmailIfEnabled } from "@/lib/notifications/create-notification";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";

// Run after() work straight away, and let the test wait for it.
let pending: Promise<unknown>[] = [];
jest.mock("next/server", () => ({
    after: (work: () => Promise<unknown>) => {
        pending.push(work());
    },
}));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { task: { findMany: jest.fn() }, user: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/notifications/create-notification", () => ({
    createNotification: jest.fn(),
    sendNotificationEmailIfEnabled: jest.fn(),
}));
jest.mock("@/lib/publisher/publisher", () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock("@/lib/email/mailer", () => ({}));

const findWaiting = prisma.task.findMany as jest.Mock;
const settle = () => Promise.all(pending);

const waiting = (id: string, assigneeId: string | null, blockers: string[]) => ({
    id,
    title: `Task ${id}`,
    status: "TODO",
    assigneeId,
    blockedBy: blockers.map((status) => ({ blockingTask: { status } })),
});

const notice = { taskId: "done-1", projectId: "p1", workspaceId: "w1", workspaceSlug: "acme", completedBy: "u-me" };

beforeEach(() => {
    pending = [];
    jest.clearAllMocks();
    (createNotification as jest.Mock).mockResolvedValue({ id: "n1" });
});

describe("notifyTaskDone", () => {
    it("tells assignees whose task has no open blockers left, in-app only", async () => {
        findWaiting.mockResolvedValue([
            waiting("ready", "u-ana", ["DONE"]),
            waiting("still-waiting", "u-bo", ["DONE", "IN_PROGRESS"]),
        ]);

        notifyTaskDone(notice);
        await settle();

        expect(findWaiting).toHaveBeenCalledWith(
            expect.objectContaining({ where: { blockedBy: { some: { blockingTaskId: "done-1" } } } }),
        );
        expect(createNotification).toHaveBeenCalledTimes(1);
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "u-ana",
                type: "TASK_UNBLOCKED",
                data: expect.objectContaining({ taskId: "ready", completedBy: "u-me", blockerId: "done-1" }),
            }),
        );
        expect(publishRealtimeEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: "notification-created", data: { userId: "u-ana", notificationId: "n1" } }),
        );
        expect(sendNotificationEmailIfEnabled).not.toHaveBeenCalled();
    });

    it("skips whoever finished the blocker", async () => {
        findWaiting.mockResolvedValue([waiting("mine", "u-me", ["DONE"])]);

        notifyTaskDone(notice);
        await settle();

        expect(createNotification).not.toHaveBeenCalled();
    });

    it("logs a failure instead of throwing", async () => {
        findWaiting.mockRejectedValue(new Error("db down"));
        const log = jest.spyOn(console, "error").mockImplementation(() => {});

        notifyTaskDone(notice);
        await settle();

        expect(log).toHaveBeenCalledWith("Unblocked notifications failed:", expect.any(Error));
        log.mockRestore();
    });
});
