/**
 * @jest-environment node
 */
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/team";
import { prisma } from "@/lib/db/prisma";
import { sendWorkspaceInvitationEmail } from "@/lib/email/mailer";

import { publishRealtimeEvent } from "@/lib/publisher/publisher";
import {
    inviteTeamAction,
    updateTeamRole,
    removeTeamAction,
    leaveWorkspaceAction,
    transferOwnershipAction,
    revokeInvitationAction,
    type InviteTeamState,
} from "./team-actions";

// ---------- module mocks ----------
jest.mock("node:crypto", () => ({
    __esModule: true,
    default: {
        // deterministic 32-byte token: "abab...ab" (64 hex chars)
        randomBytes: jest.fn(() => Buffer.alloc(32, 0xab)),
    },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// `requireRole` stands in for "load the caller's membership"; permission
// checks run through the real rules in lib/auth/permissions.
jest.mock("@/lib/auth/team", () => {
    const requireRole = jest.fn();
    const { canWorkspace, ForbiddenError } = jest.requireActual("@/lib/auth/permissions");
    return {
        requireRole,
        requireMembership: jest.fn((slug: string) => requireRole(slug)),
        requireWorkspacePermission: jest.fn(
            async (slug: string, permission: string, message?: string) => {
                const membership = await requireRole(slug);
                if (!canWorkspace(membership.role, permission)) {
                    throw new ForbiddenError(message);
                }
                return membership;
            },
        ),
    };
});
jest.mock("@/lib/publisher/publisher", () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock("next/navigation", () => ({
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("@/lib/email/mailer", () => ({ sendWorkspaceInvitationEmail: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        workspaceMember: {
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        projectMember: { deleteMany: jest.fn() },
        task: { updateMany: jest.fn() },
        workspace: { update: jest.fn() },
        $transaction: jest.fn(),
        invitation: {
            deleteMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
    },
}));
jest.mock("@/generated/prisma/client", () => {
    class PrismaClientKnownRequestError extends Error {
        code: string;
        constructor(message: string, opts: { code: string }) {
            super(message);
            this.code = opts.code;
        }
    }
    return { Prisma: { PrismaClientKnownRequestError } };
});

// ---------- typed handles ----------
const mockRevalidate = revalidatePath as unknown as jest.Mock;
const mockRequireRole = requireRole as jest.Mock;
const mockSendEmail = sendWorkspaceInvitationEmail as jest.Mock;
const mockRandomBytes = crypto.randomBytes as unknown as jest.Mock;
const db = prisma as unknown as {
    workspaceMember: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
    projectMember: { deleteMany: jest.Mock };
    task: { updateMany: jest.Mock };
    workspace: { update: jest.Mock };
    $transaction: jest.Mock;
    invitation: {
        deleteMany: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
    };
};

// ---------- helpers ----------
const NOW = new Date("2026-10-16T12:00:00Z");
const TOKEN = "ab".repeat(32);
const TEAM_PATH = "/workspace/acme/team";
const INITIAL: InviteTeamState = { success: false };

function makeMembership(overrides: Record<string, unknown> = {}) {
    return {
        id: "m-me",
        userId: "u-me",
        role: "OWNER",
        workspace: { id: "w1", name: "Acme Inc" },
        user: { name: "Grace Hopper", email: "grace@x.com" },
        ...overrides,
    };
}

function knownError(code: string) {
    const Ctor = Prisma.PrismaClientKnownRequestError as unknown as new (
        message: string,
        opts: { code: string },
    ) => Error;
    return new Ctor("prisma error", { code });
}

function invite(values: Record<string, string | Blob> = {}) {
    const fd = new FormData();
    Object.entries({ email: "ada@x.com", role: "MEMBER", ...values }).forEach(([k, v]) =>
        fd.append(k, v as any),
    );
    return inviteTeamAction("acme", INITIAL, fd);
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
    // Fake only Date so awaited mocks still resolve
    jest.useFakeTimers({
        now: NOW,
        doNotFake: [
            "nextTick",
            "setImmediate",
            "clearImmediate",
            "setTimeout",
            "clearTimeout",
            "setInterval",
            "clearInterval",
            "queueMicrotask",
        ],
    });

    mockRequireRole.mockResolvedValue(makeMembership());
    mockSendEmail.mockResolvedValue(undefined);

    db.workspaceMember.findFirst.mockResolvedValue(null);
    db.invitation.deleteMany.mockResolvedValue({ count: 0 });
    db.invitation.findFirst.mockResolvedValue(null);
    db.invitation.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "i1", ...data }),
    );
    db.invitation.delete.mockResolvedValue({});
    // Interactive transactions run against the same mocked client.
    db.$transaction.mockImplementation((arg: any) =>
        typeof arg === "function" ? arg(db) : Promise.all(arg),
    );

    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_APP_URL = "https://app.workvanta.com";
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    consoleError.mockRestore();
    delete process.env.NEXT_PUBLIC_APP_URL;
});

// ---------- inviteTeamAction ----------
describe("inviteTeamAction – permissions and input", () => {
    it("requires an OWNER or ADMIN and propagates failures", async () => {
        const error = new Error("Forbidden");
        mockRequireRole.mockRejectedValue(error);

        await expect(invite()).rejects.toBe(error);
        expect(mockRequireRole).toHaveBeenCalledWith("acme");
        expect(db.workspaceMember.findFirst).not.toHaveBeenCalled();
    });

    it.each([
        ["a missing email", undefined],
        ["an empty email", ""],
        ["a whitespace-only email", "   "],
    ])("rejects %s", async (_label, email) => {
        const fd = new FormData();
        fd.append("role", "MEMBER");
        if (email !== undefined) fd.append("email", email);

        await expect(inviteTeamAction("acme", INITIAL, fd)).resolves.toEqual({
            success: false,
            error: "Please enter an email address.",
        });
        expect(db.workspaceMember.findFirst).not.toHaveBeenCalled();
    });

    it("treats a file upload in the email field as empty", async () => {
        await expect(invite({ email: new File(["x"], "x.txt") })).resolves.toEqual({
            success: false,
            error: "Please enter an email address.",
        });
    });

    it.each([
        ["a missing role", undefined],
        ["OWNER", "OWNER"],
        ["a lowercase role", "member"],
        ["an empty role", ""],
    ])("rejects %s as a role", async (_label, role) => {
        const fd = new FormData();
        fd.append("email", "ada@x.com");
        if (role !== undefined) fd.append("role", role);

        await expect(inviteTeamAction("acme", INITIAL, fd)).resolves.toEqual({
            success: false,
            error: "Please select a valid role.",
        });
        expect(db.workspaceMember.findFirst).not.toHaveBeenCalled();
    });

    it("lets an owner invite administrators", async () => {
        await expect(invite({ role: "ADMIN" })).resolves.toEqual(
            expect.objectContaining({ success: true }),
        );
    });

    it("stops admins from inviting administrators", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));

        await expect(invite({ role: "ADMIN" })).resolves.toEqual({
            success: false,
            error: "Only the workspace owner can invite administrators.",
        });
        expect(db.invitation.create).not.toHaveBeenCalled();
    });

    it.each(["MEMBER", "GUEST"])("lets an admin invite a %s", async (role) => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));

        await expect(invite({ role })).resolves.toEqual(
            expect.objectContaining({ success: true }),
        );
        expect(db.invitation.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ role }),
        });
    });
});

describe("inviteTeamAction – existing members and pending invitations", () => {
    it("trims and lowercases the email when checking for an existing member", async () => {
        await invite({ email: "  Ada@X.COM  " });

        expect(db.workspaceMember.findFirst).toHaveBeenCalledWith({
            where: { workspaceId: "w1", user: { email: "ada@x.com" } },
            select: { id: true },
        });
    });

    it("rejects someone who is already a member", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2" });

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "This user is already a member of the workspace.",
        });
        expect(db.invitation.deleteMany).not.toHaveBeenCalled();
        expect(db.invitation.create).not.toHaveBeenCalled();
    });

    it("removes expired pending invitations before checking for active ones", async () => {
        await invite();

        expect(db.invitation.deleteMany).toHaveBeenCalledWith({
            where: {
                workspaceId: "w1",
                email: "ada@x.com",
                acceptedAt: null,
                expiresAt: { lte: NOW },
            },
        });
        expect(db.invitation.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
            db.invitation.findFirst.mock.invocationCallOrder[0],
        );
    });

    it("looks for an unexpired, unaccepted invitation", async () => {
        await invite();

        expect(db.invitation.findFirst).toHaveBeenCalledWith({
            where: {
                workspaceId: "w1",
                email: "ada@x.com",
                projectId: null,
                acceptedAt: null,
                expiresAt: { gt: NOW },
            },
            select: { id: true },
        });
    });

    it("refuses to send a second active invitation", async () => {
        db.invitation.findFirst.mockResolvedValue({ id: "old" });

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "An active invitation has already been sent to this email.",
        });
        expect(db.invitation.create).not.toHaveBeenCalled();
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});

describe("inviteTeamAction – creating the invitation", () => {
    it("creates the invitation with the chosen role and a 7-day expiry", async () => {
        await invite({ role: "GUEST" });

        expect(mockRandomBytes).toHaveBeenCalledWith(32);
        expect(db.invitation.create).toHaveBeenCalledWith({
            data: {
                email: "ada@x.com",
                token: TOKEN,
                workspaceId: "w1",
                role: "GUEST",
                expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
                invitedById: "u-me",
            },
        });
    });

    it("returns a friendly error on a unique constraint race (P2002)", async () => {
        db.invitation.create.mockRejectedValue(knownError("P2002"));

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "An active invitation has already been sent to this email.",
        });
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("rethrows other Prisma errors", async () => {
        const error = knownError("P2003");
        db.invitation.create.mockRejectedValue(error);

        await expect(invite()).rejects.toBe(error);
    });

    it("rethrows unexpected errors without sending an email", async () => {
        const error = new Error("db down");
        db.invitation.create.mockRejectedValue(error);

        await expect(invite()).rejects.toBe(error);
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});

describe("inviteTeamAction – sending the email", () => {
    it("emails the invitation link with workspace and inviter details", async () => {
        await invite();

        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail).toHaveBeenCalledWith({
            email: "ada@x.com",
            workspaceName: "Acme Inc",
            invitationUrl: `https://app.workvanta.com/invite/${TOKEN}`,
            inviterName: "Grace Hopper",
        });
    });

    it("uses the inviter's email when they have no name", async () => {
        mockRequireRole.mockResolvedValue(
            makeMembership({ user: { name: null, email: "grace@x.com" } }),
        );

        await invite();

        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({ inviterName: "grace@x.com" }),
        );
    });

    it("falls back to localhost when NEXT_PUBLIC_APP_URL is not set", async () => {
        delete process.env.NEXT_PUBLIC_APP_URL;

        await invite();

        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                invitationUrl: `http://localhost:3000/invite/${TOKEN}`,
            }),
        );
    });

    it("revalidates the team page and returns the success message", async () => {
        await expect(invite()).resolves.toEqual({
            success: true,
            message: "Invitation sent successfully to ada@x.com.",
        });
        expect(mockRevalidate).toHaveBeenCalledWith(TEAM_PATH);
    });

    it("logs, deletes the invitation, and returns an error when the email fails", async () => {
        const error = new Error("smtp down");
        mockSendEmail.mockRejectedValue(error);

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "Failed to send invitation email. Please try again.",
        });
        expect(consoleError).toHaveBeenCalledWith(
            "Failed to send workspace invitation email:",
            error,
        );
        expect(db.invitation.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("throws the cleanup error when deleting the invitation also fails", async () => {
        const cleanupError = new Error("cleanup failed");
        mockSendEmail.mockRejectedValue(new Error("smtp down"));
        db.invitation.delete.mockRejectedValue(cleanupError);

        await expect(invite()).rejects.toBe(cleanupError);
    });
});

// ---------- updateTeamRole ----------
describe("updateTeamRole", () => {
    beforeEach(() => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "MEMBER" });
        db.workspaceMember.update.mockResolvedValue({});
    });

    it("requires the OWNER role", async () => {
        const error = new Error("Forbidden");
        mockRequireRole.mockRejectedValue(error);

        await expect(updateTeamRole("acme", "m2", "ADMIN")).rejects.toBe(error);
        expect(mockRequireRole).toHaveBeenCalledWith("acme");
        expect(db.workspaceMember.findFirst).not.toHaveBeenCalled();
    });

    it("only finds members of the same workspace", async () => {
        await updateTeamRole("acme", "m2", "ADMIN");

        expect(db.workspaceMember.findFirst).toHaveBeenCalledWith({
            where: { id: "m2", workspaceId: "w1" },
            select: { id: true, role: true },
        });
    });

    it("throws when the member is not in this workspace", async () => {
        db.workspaceMember.findFirst.mockResolvedValue(null);

        await expect(updateTeamRole("acme", "m2", "ADMIN")).rejects.toThrow("Member not found.");
        expect(db.workspaceMember.update).not.toHaveBeenCalled();
    });

    it("refuses to change your own role", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m-me", role: "OWNER" });

        await expect(updateTeamRole("acme", "m-me", "ADMIN")).rejects.toThrow(
            "You cannot change your own role.",
        );
        expect(db.workspaceMember.update).not.toHaveBeenCalled();
    });

    it("refuses to change another owner", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m3", role: "OWNER" });

        await expect(updateTeamRole("acme", "m3", "ADMIN")).rejects.toThrow(
            "The workspace owner cannot be changed.",
        );
        expect(db.workspaceMember.update).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it.each(["ADMIN", "MEMBER", "GUEST"] as const)("sets the role to %s", async (role) => {
        await updateTeamRole("acme", "m2", role);

        expect(db.workspaceMember.update).toHaveBeenCalledWith({
            where: { id: "m2" },
            data: { role },
        });
        expect(mockRevalidate).toHaveBeenCalledWith(TEAM_PATH);
    });
});

// ---------- removeTeamAction ----------
describe("removeTeamAction", () => {
    beforeEach(() => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "MEMBER" });
        db.workspaceMember.delete.mockResolvedValue({});
    });

    it("requires an OWNER or ADMIN", async () => {
        const error = new Error("Forbidden");
        mockRequireRole.mockRejectedValue(error);

        await expect(removeTeamAction("acme", "m2")).rejects.toBe(error);
        expect(mockRequireRole).toHaveBeenCalledWith("acme");
        expect(db.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("only finds members of the same workspace", async () => {
        await removeTeamAction("acme", "m2");

        expect(db.workspaceMember.findFirst).toHaveBeenCalledWith({
            where: { id: "m2", workspaceId: "w1" },
            select: { id: true, role: true, userId: true },
        });
    });

    it("throws when the member is not in this workspace", async () => {
        db.workspaceMember.findFirst.mockResolvedValue(null);

        await expect(removeTeamAction("acme", "m2")).rejects.toThrow("Member not found.");
        expect(db.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("refuses to let you remove yourself", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m-me", role: "OWNER" });

        await expect(removeTeamAction("acme", "m-me")).rejects.toThrow(
            "You cannot remove yourself from the workspace.",
        );
        expect(db.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("refuses to remove an owner, even for another owner", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m3", role: "OWNER" });

        await expect(removeTeamAction("acme", "m3")).rejects.toThrow(
            "The workspace owner cannot be removed.",
        );
        expect(db.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("stops admins from removing other administrators", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m3", role: "ADMIN" });

        await expect(removeTeamAction("acme", "m3")).rejects.toThrow(
            "Admins cannot remove other administrators.",
        );
        expect(db.workspaceMember.delete).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it.each([
        ["OWNER", "ADMIN"],
        ["OWNER", "MEMBER"],
        ["OWNER", "GUEST"],
        ["ADMIN", "MEMBER"],
        ["ADMIN", "GUEST"],
    ])("lets a %s remove a %s and revalidates the team page", async (viewer, target) => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: viewer }));
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: target });

        await removeTeamAction("acme", "m2");

        expect(db.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
        expect(mockRevalidate).toHaveBeenCalledWith(TEAM_PATH);
    });
});

// ---------- authorization hardening ----------
describe("authorization hardening", () => {
    const mockPublish = publishRealtimeEvent as jest.Mock;

    it("does not let members invite anyone", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "MEMBER" }));

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "Only workspace owners and admins can invite people.",
        });
        expect(db.invitation.create).not.toHaveBeenCalled();
    });

    it("rejects malformed email addresses", async () => {
        await expect(invite({ email: "not-an-email" })).resolves.toEqual({
            success: false,
            error: "Please enter a valid email address.",
        });
    });

    it("never promotes anyone to OWNER through a role change", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "MEMBER" });

        await expect(updateTeamRole("acme", "m2", "OWNER" as any)).rejects.toThrow(
            "Please select a valid role.",
        );
        expect(db.workspaceMember.update).not.toHaveBeenCalled();
    });

    it("rejects role values outside the enum", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "MEMBER" });

        await expect(updateTeamRole("acme", "m2", "ROOT" as any)).rejects.toThrow(
            "Please select a valid role.",
        );
        expect(db.workspaceMember.update).not.toHaveBeenCalled();
    });

    it("does not let admins change roles", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));

        await expect(updateTeamRole("acme", "m2", "GUEST")).rejects.toThrow(
            "Only the workspace owner can change roles.",
        );
    });

    it("lets admins remove guests", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "GUEST", userId: "u2" });

        await removeTeamAction("acme", "m2");

        expect(db.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
    });

    it("cleans up project roles and assignments when removing someone", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "MEMBER", userId: "u2" });

        await removeTeamAction("acme", "m2");

        expect(db.projectMember.deleteMany).toHaveBeenCalledWith({
            where: { userId: "u2", project: { workspaceId: "w1" } },
        });
        expect(db.task.updateMany).toHaveBeenCalledWith({
            where: { assigneeId: "u2", project: { workspaceId: "w1" } },
            data: { assigneeId: null },
        });
        expect(mockPublish).toHaveBeenCalledWith({
            type: "workspace-access-revoked",
            workspaceId: "w1",
            data: { userId: "u2" },
        });
    });

    it("still removes the member when realtime publishing fails", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "MEMBER", userId: "u2" });
        mockPublish.mockRejectedValueOnce(new Error("redis down"));

        await expect(removeTeamAction("acme", "m2")).resolves.toBeUndefined();
        expect(db.workspaceMember.delete).toHaveBeenCalled();
    });
});

describe("leaveWorkspaceAction", () => {
    it("tells the owner to transfer ownership first", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "OWNER" }));

        await expect(leaveWorkspaceAction("acme")).resolves.toEqual({
            error: "Transfer ownership to someone else before leaving this workspace.",
        });
        expect(db.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("removes a member's access and redirects to the workspace list", async () => {
        mockRequireRole.mockResolvedValue(
            makeMembership({ role: "MEMBER", userId: "me" }),
        );

        await expect(leaveWorkspaceAction("acme")).rejects.toThrow("NEXT_REDIRECT:/workspace");

        expect(db.projectMember.deleteMany).toHaveBeenCalledWith({
            where: { userId: "me", project: { workspaceId: "w1" } },
        });
        expect(db.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "m-me" } });
    });
});

describe("transferOwnershipAction", () => {
    beforeEach(() => {
        db.workspaceMember.update.mockResolvedValue({});
        db.workspace.update.mockResolvedValue({});
    });

    it("only lets the owner transfer", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));

        await expect(transferOwnershipAction("acme", "m2")).resolves.toEqual({
            error: "Only the workspace owner can transfer ownership.",
        });
        expect(db.workspace.update).not.toHaveBeenCalled();
    });

    it("refuses to hand a workspace to a guest", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "GUEST", userId: "u2" });

        await expect(transferOwnershipAction("acme", "m2")).resolves.toEqual({
            error: "Guests can't own a workspace. Change their role first.",
        });
    });

    it("swaps roles and updates the workspace owner", async () => {
        db.workspaceMember.findFirst.mockResolvedValue({ id: "m2", role: "ADMIN", userId: "u2" });

        await expect(transferOwnershipAction("acme", "m2")).resolves.toEqual({});

        expect(db.workspaceMember.update).toHaveBeenCalledWith({
            where: { id: "m-me" },
            data: { role: "ADMIN" },
        });
        expect(db.workspaceMember.update).toHaveBeenCalledWith({
            where: { id: "m2" },
            data: { role: "OWNER" },
        });
        expect(db.workspace.update).toHaveBeenCalledWith({
            where: { id: "w1" },
            data: { ownerId: "u2" },
        });
    });
});

describe("revokeInvitationAction", () => {
    it("deletes a pending invitation in this workspace", async () => {
        db.invitation.findFirst.mockResolvedValue({ id: "i1", role: "MEMBER" });

        await expect(revokeInvitationAction("acme", "i1")).resolves.toEqual({});

        expect(db.invitation.findFirst).toHaveBeenCalledWith({
            where: { id: "i1", workspaceId: "w1", acceptedAt: null },
            select: { id: true, role: true },
        });
        expect(db.invitation.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
    });

    it("stops admins from cancelling admin invitations", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "ADMIN" }));
        db.invitation.findFirst.mockResolvedValue({ id: "i1", role: "ADMIN" });

        await expect(revokeInvitationAction("acme", "i1")).resolves.toEqual({
            error: "Only the workspace owner can cancel an administrator invitation.",
        });
        expect(db.invitation.delete).not.toHaveBeenCalled();
    });

    it("does not let members manage invitations", async () => {
        mockRequireRole.mockResolvedValue(makeMembership({ role: "MEMBER" }));

        await expect(revokeInvitationAction("acme", "i1")).resolves.toEqual({
            error: "Only workspace owners and admins can manage invitations.",
        });
    });
});
