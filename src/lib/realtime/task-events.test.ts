import { publishTaskChanged } from "./task-events";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";

jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        project: { findUnique: jest.fn() },
        workspaceMember: { findMany: jest.fn() },
    },
}));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/publisher/publisher", () => ({ publishRealtimeEvent: jest.fn() }));

const db = prisma as unknown as {
    project: { findUnique: jest.Mock };
    workspaceMember: { findMany: jest.Mock };
};
const mockSession = getSession as jest.Mock;
const mockPublish = publishRealtimeEvent as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { id: "u1" } });
    db.project.findUnique.mockResolvedValue({ id: "p1", workspaceId: "w1", visibility: "PRIVATE" });
    db.workspaceMember.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
});

describe("publishTaskChanged", () => {
    it("sends the change only to people who can open the project", async () => {
        await publishTaskChanged("p1", { taskId: "t1", kind: "moved" });

        // Private project: admins and project members only, never plain members.
        expect(db.workspaceMember.findMany).toHaveBeenCalledWith({
            where: {
                workspaceId: "w1",
                OR: [
                    { role: { in: ["OWNER", "ADMIN"] } },
                    { user: { projectMemberships: { some: { projectId: "p1" } } } },
                ],
            },
            select: { userId: true },
        });
        expect(mockPublish).toHaveBeenCalledWith({
            type: "task-changed",
            workspaceId: "w1",
            recipientIds: ["u1", "u2"],
            data: { projectId: "p1", taskId: "t1", kind: "moved", actorId: "u1" },
        });
    });

    it("includes plain members for workspace-visible projects", async () => {
        db.project.findUnique.mockResolvedValue({ id: "p1", workspaceId: "w1", visibility: "WORKSPACE" });

        await publishTaskChanged("p1", { kind: "created" });

        const where = db.workspaceMember.findMany.mock.calls[0][0].where;
        expect(where.OR).toContainEqual({ role: "MEMBER" });
        expect(mockPublish.mock.calls[0][0].data.taskId).toBeNull();
    });

    it("does nothing for a missing project or an empty audience", async () => {
        db.project.findUnique.mockResolvedValueOnce(null);
        await publishTaskChanged("gone", { taskId: "t1", kind: "deleted" });

        db.workspaceMember.findMany.mockResolvedValueOnce([]);
        await publishTaskChanged("p1", { taskId: "t1", kind: "deleted" });

        expect(mockPublish).not.toHaveBeenCalled();
    });

    it("never throws: the change is already saved", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockPublish.mockRejectedValueOnce(new Error("redis down"));

        await expect(publishTaskChanged("p1", { taskId: "t1", kind: "updated" })).resolves.toBeUndefined();
        expect(spy).toHaveBeenCalledWith("Failed to publish task change:", expect.any(Error));
        spy.mockRestore();
    });
});
