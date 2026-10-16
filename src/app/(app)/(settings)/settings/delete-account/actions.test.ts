/**
 * @jest-environment node
 */
import { redirect } from "next/navigation";
import { destroyCurrentSession, getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getOwnedWorkspaces } from "@/lib/account/owned-workspaces";

import { deleteAccount } from "./actions";

jest.mock("next/navigation", () => ({
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("@/lib/auth/session", () => ({
    getSession: jest.fn(),
    destroyCurrentSession: jest.fn(),
}));
jest.mock("@/lib/account/owned-workspaces", () => ({
    DELETE_CONFIRMATION: "DELETE",
    getOwnedWorkspaces: jest.fn(),
}));

const deleteManyModels = [
    "workspace",
    "projectMember",
    "workspaceMember",
    "invitation",
    "session",
    "account",
    "twoFactorAuth",
    "twoFactorChallenge",
    "twoFactorRememberToken",
    "emailVerificationToken",
    "passwordResetToken",
    "verificationToken",
    "notification",
    "notificationPreference",
    "userPreference",
] as const;

jest.mock("@/lib/db/prisma", () => {
    const model = () => ({ deleteMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() });
    const client: Record<string, any> = {
        user: { findUnique: jest.fn(), update: jest.fn() },
        task: { updateMany: jest.fn() },
        $transaction: jest.fn(),
    };
    for (const name of [
        "workspace", "projectMember", "workspaceMember", "invitation", "session",
        "account", "twoFactorAuth", "twoFactorChallenge", "twoFactorRememberToken",
        "emailVerificationToken", "passwordResetToken", "verificationToken",
        "notification", "notificationPreference", "userPreference",
    ]) {
        client[name] = model();
    }
    return { prisma: client };
});

const db = prisma as unknown as Record<string, any>;
const mockGetSession = getSession as jest.Mock;
const mockDestroy = destroyCurrentSession as jest.Mock;
const mockOwned = getOwnedWorkspaces as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

let consoleError: jest.SpyInstance;

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    db.user.findUnique.mockResolvedValue({ email: "ada@x.com" });
    mockOwned.mockResolvedValue({ shared: [], solo: [] });
    db.$transaction.mockImplementation((cb: any) => cb(db));
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    jest.clearAllMocks();
    consoleError.mockRestore();
});

describe("deleteAccount", () => {
    it("redirects to sign-in when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(deleteAccount("DELETE")).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("requires the typed confirmation on the server too", async () => {
        await expect(deleteAccount("delete")).resolves.toEqual({
            error: 'Type "DELETE" to confirm account deletion.',
        });
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("refuses while the user owns workspaces other people use", async () => {
        mockOwned.mockResolvedValue({
            shared: [{ id: "w1", name: "Acme", slug: "acme", memberCount: 3 }],
            solo: [],
        });

        await expect(deleteAccount("DELETE")).resolves.toEqual({
            error: "You still own workspaces other people use (Acme). Transfer ownership or delete them first.",
        });
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(db.workspace.deleteMany).not.toHaveBeenCalled();
    });

    it("deletes solo workspaces, erases personal data and anonymises the user", async () => {
        mockOwned.mockResolvedValue({
            shared: [],
            solo: [{ id: "w9", name: "Mine", slug: "mine", memberCount: 1 }],
        });

        await expect(deleteAccount("DELETE")).rejects.toThrow(
            "NEXT_REDIRECT:/signin?deleted=1",
        );

        expect(db.workspace.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["w9"] } },
        });
        expect(db.task.updateMany).toHaveBeenCalledWith({
            where: { assigneeId: "u1" },
            data: { assigneeId: null },
        });
        expect(db.invitation.deleteMany).toHaveBeenCalledWith({
            where: { email: "ada@x.com" },
        });
        for (const name of deleteManyModels.filter(
            (m) => !["workspace", "invitation", "verificationToken"].includes(m),
        )) {
            expect(db[name].deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
        }
        expect(db.user.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: expect.objectContaining({
                name: "Deleted user",
                email: "deleted-u1@deleted.invalid",
                passwordHash: null,
                image: null,
            }),
        });
        expect(mockDestroy).toHaveBeenCalled();
    });

    it("does not touch workspaces when there are none to remove", async () => {
        await expect(deleteAccount("DELETE")).rejects.toThrow("NEXT_REDIRECT");
        expect(db.workspace.deleteMany).not.toHaveBeenCalled();
    });

    it("returns a friendly error and stays signed in if the database fails", async () => {
        db.$transaction.mockRejectedValue(new Error("db down"));

        await expect(deleteAccount("DELETE")).resolves.toEqual({
            error: "Something went wrong while deleting your account. Please try again.",
        });
        expect(mockDestroy).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});
