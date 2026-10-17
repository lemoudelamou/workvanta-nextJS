import { updateNotificationPreference } from "./actions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { notificationPreference: { upsert: jest.fn() } },
}));

const mockSession = getSession as jest.Mock;
const upsert = (prisma as unknown as { notificationPreference: { upsert: jest.Mock } }).notificationPreference.upsert;

beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { id: "u1" } });
});

describe("updateNotificationPreference", () => {
    it("saves one switch for the signed-in user", async () => {
        await expect(updateNotificationPreference("emailMentions", false)).resolves.toEqual({});

        expect(upsert).toHaveBeenCalledWith({
            where: { userId: "u1" },
            update: { emailMentions: false },
            create: { userId: "u1", emailMentions: false },
        });
    });

    it("refuses unknown columns, so nothing else on the row can be written", async () => {
        await expect(updateNotificationPreference("userId", true)).resolves.toEqual({
            error: "That setting doesn't exist.",
        });
        await expect(updateNotificationPreference("emailInvitations", true)).resolves.toHaveProperty("error");
        expect(upsert).not.toHaveBeenCalled();
    });

    it("requires a boolean and a session", async () => {
        await expect(updateNotificationPreference("inAppComments", "yes" as unknown as boolean)).resolves.toHaveProperty("error");

        mockSession.mockResolvedValue(null);
        await expect(updateNotificationPreference("inAppComments", true)).resolves.toEqual({
            error: "Please sign in again.",
        });
        expect(upsert).not.toHaveBeenCalled();
    });
});
