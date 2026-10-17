import { publishRealtimeEvent } from "./publisher";
import { ablyRest } from "@/lib/realtime/ably";

jest.mock("@/lib/realtime/ably", () => ({ ablyRest: jest.fn() }));

const batchPublish = jest.fn();
const mockAbly = ablyRest as jest.Mock;

beforeEach(() => {
    batchPublish.mockReset().mockResolvedValue({});
    mockAbly.mockReturnValue({ batchPublish });
});

describe("publishRealtimeEvent", () => {
    it("sends a project event to each person in its audience, once", async () => {
        await publishRealtimeEvent({
            type: "task-changed",
            workspaceId: "w1",
            recipientIds: ["u1", "u2", "u1", ""],
            data: { projectId: "p1", taskId: "t1", kind: "moved", actorId: "u1" },
        });

        expect(batchPublish).toHaveBeenCalledWith({
            channels: ["user:u1", "user:u2"],
            messages: [{ name: "task-changed", data: { projectId: "p1", taskId: "t1", kind: "moved", actorId: "u1" } }],
        });
    });

    it("sends a notification only to its owner", async () => {
        await publishRealtimeEvent({
            type: "notification-created",
            workspaceId: "w1",
            data: { userId: "u9", notificationId: "n1" },
        });

        expect(batchPublish).toHaveBeenCalledWith(expect.objectContaining({ channels: ["user:u9"] }));
    });

    it("publishes in batches of 100 channels", async () => {
        const recipientIds = Array.from({ length: 150 }, (_, i) => `u${i}`);
        await publishRealtimeEvent({
            type: "comment-created",
            workspaceId: "w1",
            recipientIds,
            data: { commentId: "c1", taskId: "t1", projectId: "p1", authorId: "u0" },
        });

        expect(batchPublish).toHaveBeenCalledTimes(2);
        expect(batchPublish.mock.calls[0][0].channels).toHaveLength(100);
        expect(batchPublish.mock.calls[1][0].channels).toHaveLength(50);
    });

    it("does nothing when realtime is off", async () => {
        mockAbly.mockReturnValue(null);
        await publishRealtimeEvent({
            type: "notification-created",
            workspaceId: "w1",
            data: { userId: "u9", notificationId: "n1" },
        });

        expect(batchPublish).not.toHaveBeenCalled();
    });
});
