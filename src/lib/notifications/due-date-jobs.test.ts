import { digestSchedule, runDailyDigest, runDueDateSweep } from "./due-date-jobs";
import { prisma } from "@/lib/db/prisma-client";
import { createNotification } from "@/lib/notifications/create-notification";
import { findDigestTasks, findDueReminders } from "@/lib/notifications/due-dates";
import { sendDueDigestEmail } from "@/lib/email/mailer";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";

jest.mock("@/lib/db/prisma-client", () => ({
    prisma: { notification: { findUnique: jest.fn() }, user: { findMany: jest.fn() } },
}));
jest.mock("@/lib/notifications/create-notification", () => ({ createNotification: jest.fn() }));
jest.mock("@/lib/email/mailer", () => ({ sendDueDigestEmail: jest.fn() }));
jest.mock("@/lib/publisher/publisher", () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock("@/lib/notifications/due-dates", () => ({
    ...jest.requireActual("@/lib/notifications/due-dates"),
    findDueReminders: jest.fn(),
    findDigestTasks: jest.fn(),
}));

const db = prisma as unknown as { notification: { findUnique: jest.Mock }; user: { findMany: jest.Mock } };
const NOW = new Date("2026-10-17T08:00:00Z");
const project = { id: "p1", name: "Website", workspaceId: "w1", visibility: "WORKSPACE" as const, workspace: { slug: "acme" } };
const dueTask = { id: "t1", title: "Ship v2", dueDate: new Date("2026-10-17T15:00:00Z"), assigneeId: "u1", project };

function store(setResult: unknown = "OK") {
    return { set: jest.fn().mockResolvedValue(setResult), del: jest.fn() };
}

beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DIGEST_HOUR;
    delete process.env.DIGEST_TIMEZONE;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test/";
});

describe("digestSchedule", () => {
    it("defaults to 8am UTC and reads the environment", () => {
        expect(digestSchedule()).toEqual({ pattern: "0 8 * * *", tz: "UTC" });
        process.env.DIGEST_HOUR = "7";
        process.env.DIGEST_TIMEZONE = "Europe/Berlin";
        expect(digestSchedule()).toEqual({ pattern: "0 7 * * *", tz: "Europe/Berlin" });
        process.env.DIGEST_HOUR = "31";
        expect(digestSchedule().pattern).toBe("0 8 * * *");
    });
});

describe("runDueDateSweep", () => {
    it("creates each reminder once and tells the bell", async () => {
        (findDueReminders as jest.Mock).mockResolvedValue([
            { kind: "TASK_DUE_SOON", task: dueTask, dedupeKey: "due-soon:t1:x" },
            { kind: "TASK_OVERDUE", task: { ...dueTask, id: "t2" }, dedupeKey: "overdue:t2:x" },
        ]);
        db.notification.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "already" });
        (createNotification as jest.Mock).mockResolvedValue({ id: "n1" });

        expect(await runDueDateSweep(NOW)).toEqual({ checked: 2, created: 1 });
        expect(createNotification).toHaveBeenCalledTimes(1);
        expect(createNotification).toHaveBeenCalledWith({
            userId: "u1",
            type: "TASK_DUE_SOON",
            dedupeKey: "due-soon:t1:x",
            data: {
                taskId: "t1",
                projectId: "p1",
                workspaceSlug: "acme",
                taskTitle: "Ship v2",
                dueDate: "2026-10-17T15:00:00.000Z",
            },
        });
        expect(publishRealtimeEvent).toHaveBeenCalledWith({
            type: "notification-created",
            workspaceId: "w1",
            data: { userId: "u1", notificationId: "n1" },
        });
    });

    it("stays quiet when the person turned in-app reminders off", async () => {
        (findDueReminders as jest.Mock).mockResolvedValue([{ kind: "TASK_DUE_SOON", task: dueTask, dedupeKey: "k" }]);
        db.notification.findUnique.mockResolvedValue(null);
        (createNotification as jest.Mock).mockResolvedValue(null);

        expect(await runDueDateSweep(NOW)).toEqual({ checked: 1, created: 0 });
        expect(publishRealtimeEvent).not.toHaveBeenCalled();
    });
});

describe("runDailyDigest", () => {
    beforeEach(() => {
        (findDigestTasks as jest.Mock).mockResolvedValue(
            new Map([
                ["u1", [dueTask]],
                ["u2", [dueTask]],
                ["u3", [{ ...dueTask, dueDate: new Date("2026-12-01T00:00:00Z") }]],
            ]),
        );
        db.user.findMany.mockResolvedValue([
            { id: "u1", email: "maya@x.com", name: "Maya Chen", notificationPreferences: null },
            { id: "u2", email: "off@x.com", name: null, notificationPreferences: { emailDueDates: false } },
            { id: "u3", email: "far@x.com", name: null, notificationPreferences: { emailDueDates: true } },
        ]);
    });

    it("emails people with something due, unless they turned it off", async () => {
        const once = store();
        expect(await runDailyDigest(once, NOW)).toEqual({ sent: 1 });
        expect(once.set).toHaveBeenCalledWith("digest:u1:2026-10-17", "1", "EX", 172800, "NX");
        expect(sendDueDigestEmail).toHaveBeenCalledTimes(1);
        const { email, name, digest } = (sendDueDigestEmail as jest.Mock).mock.calls[0][0];
        expect([email, name]).toEqual(["maya@x.com", "Maya Chen"]);
        expect(digest.today[0].url).toBe("https://app.test/workspace/acme/project/p1/tasks/t1");
    });

    it("doesn't send twice on the same day", async () => {
        expect(await runDailyDigest(store(null), NOW)).toEqual({ sent: 0 });
        expect(sendDueDigestEmail).not.toHaveBeenCalled();
    });

    it("frees the day's slot when sending fails, so a retry can send it", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        (sendDueDigestEmail as jest.Mock).mockRejectedValue(new Error("SMTP down"));
        const once = store();
        expect(await runDailyDigest(once, NOW)).toEqual({ sent: 0 });
        expect(once.del).toHaveBeenCalledWith("digest:u1:2026-10-17");
    });
});
