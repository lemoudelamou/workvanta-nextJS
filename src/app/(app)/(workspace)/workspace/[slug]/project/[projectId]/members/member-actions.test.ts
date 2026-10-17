/**
 * @jest-environment node
 */
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireProjectPermission } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { sendProjectInvitationEmail } from "@/lib/email/mailer";

import {
    inviteToProjectAction,
    updateProjectMemberRoleAction,
    removeProjectMemberAction,
    type InviteProjectMemberState,
} from "./member-actions";

// ---------- module mocks ----------
jest.mock("node:crypto", () => ({
    __esModule: true,
    default: {
        // deterministic 32-byte token: "abab...ab" (64 hex chars)
        randomBytes: jest.fn(() => Buffer.alloc(32, 0xab)),
    },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({ requireProjectPermission: jest.fn() }));
jest.mock("@/lib/email/mailer", () => ({ sendProjectInvitationEmail: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        workspaceMember: { findUnique: jest.fn() },
        projectMember: {
            upsert: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
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
const mockRequireRole = requireProjectPermission as jest.Mock;
const mockSendEmail = sendProjectInvitationEmail as jest.Mock;
const mockRandomBytes = crypto.randomBytes as unknown as jest.Mock;
const db = prisma as unknown as {
    user: { findUnique: jest.Mock };
    workspaceMember: { findUnique: jest.Mock };
    projectMember: {
        upsert: jest.Mock;
        findFirst: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
    };
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
const MEMBERS_PATH = "/workspace/acme/project/p1/members";
const INITIAL: InviteProjectMemberState = { success: false };

const access = {
    userId: "me",
    workspaceRole: "MEMBER",
    workspace: { id: "w1", name: "Acme Inc" },
    project: { id: "p1", name: "Apollo" },
};

function knownError(code: string) {
    const Ctor = Prisma.PrismaClientKnownRequestError as unknown as new (
        message: string,
        opts: { code: string },
    ) => Error;
    return new Ctor("prisma error", { code });
}

function form(values: Record<string, string | Blob> = {}) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v as any));
    return fd;
}

function invite(values: Record<string, string | Blob> = {}) {
    return inviteToProjectAction(
        "acme",
        "p1",
        INITIAL,
        form({ email: "ada@x.com", role: "EDITOR", ...values }),
    );
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

    mockRequireRole.mockResolvedValue(access);
    mockSendEmail.mockResolvedValue(undefined);

    // user.findUnique is called for the invitee (by email) and the inviter (by id)
    db.user.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where.email ? null : { name: "Grace Hopper" }),
    );
    db.workspaceMember.findUnique.mockResolvedValue(null);
    db.projectMember.upsert.mockResolvedValue({});
    db.invitation.deleteMany.mockResolvedValue({ count: 0 });
    db.invitation.findFirst.mockResolvedValue(null);
    db.invitation.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "i1", ...data }),
    );
    db.invitation.delete.mockResolvedValue({});

    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_APP_URL = "https://app.workvanta.com";
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    consoleError.mockRestore();
    delete process.env.NEXT_PUBLIC_APP_URL;
});

// ---------- inviteToProjectAction ----------
describe("inviteToProjectAction – permissions and input", () => {
    it("requires the project ADMIN role and propagates failures", async () => {
        const error = new Error("Forbidden");
        mockRequireRole.mockRejectedValue(error);

        await expect(invite()).rejects.toBe(error);
        expect(mockRequireRole).toHaveBeenCalledWith(
            "acme",
            "p1",
            "project.members.manage",
            expect.any(String),
        );
        expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it.each([
        ["a missing email", undefined],
        ["an empty email", ""],
        ["a whitespace-only email", "   "],
    ])("rejects %s", async (_label, email) => {
        const fd = new FormData();
        fd.append("role", "EDITOR");
        if (email !== undefined) fd.append("email", email);

        await expect(inviteToProjectAction("acme", "p1", INITIAL, fd)).resolves.toEqual({
            success: false,
            error: "Please enter an email address.",
        });
        expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it("treats a file upload in the email field as empty", async () => {
        await expect(
            invite({ email: new File(["x"], "x.txt") }),
        ).resolves.toEqual({ success: false, error: "Please enter an email address." });
    });

    it.each([
        ["a missing role", undefined],
        ["an unknown role", "OWNER"],
        ["a lowercase role", "editor"],
        ["an empty role", ""],
    ])("rejects %s", async (_label, role) => {
        const fd = new FormData();
        fd.append("email", "ada@x.com");
        if (role !== undefined) fd.append("role", role);

        await expect(inviteToProjectAction("acme", "p1", INITIAL, fd)).resolves.toEqual({
            success: false,
            error: "Please select a valid role.",
        });
        expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it.each(["ADMIN", "EDITOR", "VIEWER"])("accepts the %s role", async (role) => {
        await expect(invite({ role })).resolves.toEqual(
            expect.objectContaining({ success: true }),
        );
    });

    it("trims and lowercases the email before looking up the user", async () => {
        await invite({ email: "  Ada@X.COM  " });

        expect(db.user.findUnique).toHaveBeenCalledWith({
            where: { email: "ada@x.com" },
            select: { id: true },
        });
    });
});

describe("inviteToProjectAction – existing workspace member", () => {
    beforeEach(() => {
        db.user.findUnique.mockImplementation(({ where }: any) =>
            Promise.resolve(where.email ? { id: "u2" } : { name: "Grace Hopper" }),
        );
        db.workspaceMember.findUnique.mockResolvedValue({ id: "wm1" });
    });

    it("checks membership of the inviting workspace", async () => {
        await invite();

        expect(db.workspaceMember.findUnique).toHaveBeenCalledWith({
            where: { workspaceId_userId: { workspaceId: "w1", userId: "u2" } },
            select: { id: true },
        });
    });

    it("adds them straight to the project without creating an invitation or email", async () => {
        await expect(invite({ role: "VIEWER" })).resolves.toEqual({
            success: true,
            message: "ada@x.com was added to the project.",
        });

        expect(db.projectMember.upsert).toHaveBeenCalledWith({
            where: { projectId_userId: { projectId: "p1", userId: "u2" } },
            update: { role: "VIEWER" },
            create: { projectId: "p1", userId: "u2", role: "VIEWER" },
        });
        expect(db.invitation.create).not.toHaveBeenCalled();
        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(mockRevalidate).toHaveBeenCalledWith(MEMBERS_PATH);
    });
});

describe("inviteToProjectAction – existing user outside the workspace", () => {
    it("falls through to the invitation flow", async () => {
        db.user.findUnique.mockImplementation(({ where }: any) =>
            Promise.resolve(where.email ? { id: "u2" } : { name: "Grace Hopper" }),
        );
        db.workspaceMember.findUnique.mockResolvedValue(null);

        await expect(invite()).resolves.toEqual(expect.objectContaining({ success: true }));

        expect(db.projectMember.upsert).not.toHaveBeenCalled();
        expect(db.invitation.create).toHaveBeenCalledTimes(1);
    });
});

describe("inviteToProjectAction – pending invitations", () => {
    it("removes expired pending invitations before checking for active ones", async () => {
        await invite();

        expect(db.invitation.deleteMany).toHaveBeenCalledWith({
            where: {
                workspaceId: "w1",
                projectId: "p1",
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
                projectId: "p1",
                email: "ada@x.com",
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

describe("inviteToProjectAction – creating the invitation", () => {
    it("creates a GUEST workspace invitation with the project role and a 7-day expiry", async () => {
        await invite({ role: "ADMIN" });

        expect(mockRandomBytes).toHaveBeenCalledWith(32);
        expect(db.invitation.create).toHaveBeenCalledWith({
            data: {
                email: "ada@x.com",
                token: TOKEN,
                workspaceId: "w1",
                role: "GUEST",
                projectId: "p1",
                projectRole: "ADMIN",
                expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
                invitedById: "me",
            },
        });
    });

    it("returns a friendly error on a unique constraint race (P2002)", async () => {
        db.invitation.create.mockRejectedValue(knownError("P2002"));

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "An invitation has already been sent to this email.",
        });
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("rethrows other Prisma errors", async () => {
        const error = knownError("P2003");
        db.invitation.create.mockRejectedValue(error);

        await expect(invite()).rejects.toBe(error);
    });

    it("rethrows unexpected errors", async () => {
        const error = new Error("db down");
        db.invitation.create.mockRejectedValue(error);

        await expect(invite()).rejects.toBe(error);
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});

describe("inviteToProjectAction – inviter lookup", () => {
    it("looks up the inviter by the current user id", async () => {
        await invite();

        expect(db.user.findUnique).toHaveBeenCalledWith({
            where: { id: "me" },
            select: { name: true },
        });
    });

    it("deletes the invitation and fails when the inviter cannot be found", async () => {
        db.user.findUnique.mockResolvedValue(null);

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "Unable to identify the inviter. Please try again.",
        });
        expect(db.invitation.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

describe("inviteToProjectAction – sending the email", () => {
    it("emails the invitation link with workspace, project and inviter details", async () => {
        await invite();

        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail).toHaveBeenCalledWith({
            email: "ada@x.com",
            workspaceName: "Acme Inc",
            projectName: "Apollo",
            invitationUrl: `https://app.workvanta.com/invite/${TOKEN}`,
            inviterName: "Grace Hopper",
        });
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

    it("uses a generic inviter name when the user has no name", async () => {
        db.user.findUnique.mockImplementation(({ where }: any) =>
            Promise.resolve(where.email ? null : { name: null }),
        );

        await invite();

        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({ inviterName: "A team member" }),
        );
    });

    it("revalidates the members page and returns the success message", async () => {
        await expect(invite()).resolves.toEqual({
            success: true,
            message: "Invitation sent successfully to ada@x.com.",
        });
        expect(mockRevalidate).toHaveBeenCalledWith(MEMBERS_PATH);
    });

    it("logs, deletes the invitation, and returns an error when the email fails", async () => {
        const error = new Error("smtp down");
        mockSendEmail.mockRejectedValue(error);

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "Failed to send invitation email. Please try again.",
        });
        expect(consoleError).toHaveBeenCalledWith(
            "Failed to send project invitation email:",
            error,
        );
        expect(db.invitation.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("still returns the email error when cleanup also fails", async () => {
        const cleanupError = new Error("cleanup failed");
        mockSendEmail.mockRejectedValue(new Error("smtp down"));
        db.invitation.delete.mockRejectedValue(cleanupError);

        await expect(invite()).resolves.toEqual({
            success: false,
            error: "Failed to send invitation email. Please try again.",
        });
        expect(consoleError).toHaveBeenCalledWith(
            "Failed to delete invitation after email failure:",
            cleanupError,
        );
    });
});

// ---------- updateProjectMemberRoleAction ----------
describe("updateProjectMemberRoleAction", () => {
    beforeEach(() => {
        db.projectMember.findFirst.mockResolvedValue({ id: "m1" });
        db.projectMember.update.mockResolvedValue({});
    });

    it("requires the project ADMIN role", async () => {
        const error = new Error("Forbidden");
        mockRequireRole.mockRejectedValue(error);

        await expect(updateProjectMemberRoleAction("acme", "p1", "m1", "VIEWER")).rejects.toBe(
            error,
        );
        expect(mockRequireRole).toHaveBeenCalledWith("acme", "p1", "project.members.manage");
        expect(db.projectMember.findFirst).not.toHaveBeenCalled();
    });

    it("only finds members of the same project", async () => {
        await updateProjectMemberRoleAction("acme", "p1", "m1", "VIEWER");

        expect(db.projectMember.findFirst).toHaveBeenCalledWith({
            where: { id: "m1", projectId: "p1" },
            select: { id: true, userId: true },
        });
    });

    it("throws and updates nothing when the member is not in this project", async () => {
        db.projectMember.findFirst.mockResolvedValue(null);

        await expect(updateProjectMemberRoleAction("acme", "p1", "m1", "VIEWER")).rejects.toThrow(
            "Project member not found.",
        );
        expect(db.projectMember.update).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("updates the role and revalidates the members page", async () => {
        await updateProjectMemberRoleAction("acme", "p1", "m1", "EDITOR");

        expect(db.projectMember.update).toHaveBeenCalledWith({
            where: { id: "m1" },
            data: { role: "EDITOR" },
        });
        expect(mockRevalidate).toHaveBeenCalledWith(MEMBERS_PATH);
    });
});

// ---------- removeProjectMemberAction ----------
describe("removeProjectMemberAction", () => {
    beforeEach(() => {
        db.projectMember.findFirst.mockResolvedValue({ id: "m1", userId: "u2" });
        db.projectMember.delete.mockResolvedValue({});
    });

    it("requires the project ADMIN role", async () => {
        const error = new Error("Forbidden");
        mockRequireRole.mockRejectedValue(error);

        await expect(removeProjectMemberAction("acme", "p1", "m1")).rejects.toBe(error);
        expect(mockRequireRole).toHaveBeenCalledWith("acme", "p1", "project.members.manage");
        expect(db.projectMember.delete).not.toHaveBeenCalled();
    });

    it("only finds members of the same project", async () => {
        await removeProjectMemberAction("acme", "p1", "m1");

        expect(db.projectMember.findFirst).toHaveBeenCalledWith({
            where: { id: "m1", projectId: "p1" },
            select: { id: true, userId: true },
        });
    });

    it("throws when the member is not in this project", async () => {
        db.projectMember.findFirst.mockResolvedValue(null);

        await expect(removeProjectMemberAction("acme", "p1", "m1")).rejects.toThrow(
            "Project member not found.",
        );
        expect(db.projectMember.delete).not.toHaveBeenCalled();
    });

    it("refuses to let admins remove themselves", async () => {
        db.projectMember.findFirst.mockResolvedValue({ id: "m1", userId: "me" });

        await expect(removeProjectMemberAction("acme", "p1", "m1")).rejects.toThrow(
            "You cannot remove yourself from the project.",
        );
        expect(db.projectMember.delete).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("deletes another member and revalidates the members page", async () => {
        await removeProjectMemberAction("acme", "p1", "m1");

        expect(db.projectMember.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
        expect(mockRevalidate).toHaveBeenCalledWith(MEMBERS_PATH);
    });
});

// ---------- authorization hardening ----------
describe("project member authorization hardening", () => {
    beforeEach(() => {
        db.projectMember.findFirst.mockResolvedValue({ id: "m1", userId: "u2" });
    });

    it("returns the permission error instead of throwing when inviting without rights", async () => {
        const { ForbiddenError } = jest.requireActual("@/lib/auth/permissions");
        mockRequireRole.mockRejectedValue(
            new ForbiddenError("Only project admins can add people to this project."),
        );
        const fd = new FormData();
        fd.append("email", "ada@x.com");
        fd.append("role", "VIEWER");

        await expect(inviteToProjectAction("acme", "p1", INITIAL, fd)).resolves.toEqual({
            success: false,
            error: "Only project admins can add people to this project.",
        });
    });

    it("rejects role values outside the enum", async () => {
        await expect(
            updateProjectMemberRoleAction("acme", "p1", "m1", "OWNER" as any),
        ).rejects.toThrow("Please select a valid role.");
        expect(db.projectMember.update).not.toHaveBeenCalled();
    });

    it("stops a project admin from changing their own role", async () => {
        db.projectMember.findFirst.mockResolvedValue({ id: "m1", userId: "me" });

        await expect(
            updateProjectMemberRoleAction("acme", "p1", "m1", "VIEWER"),
        ).rejects.toThrow("You cannot change your own project role.");
        expect(db.projectMember.update).not.toHaveBeenCalled();
    });

    it("lets workspace admins change their own project role", async () => {
        mockRequireRole.mockResolvedValue({ ...access, workspaceRole: "ADMIN" });
        db.projectMember.findFirst.mockResolvedValue({ id: "m1", userId: "me" });

        await updateProjectMemberRoleAction("acme", "p1", "m1", "VIEWER");

        expect(db.projectMember.update).toHaveBeenCalled();
    });

    it("does not let admins demote themselves by re-inviting their own email", async () => {
        db.user.findUnique.mockResolvedValue({ id: "me" });
        const fd = new FormData();
        fd.append("email", "me@x.com");
        fd.append("role", "VIEWER");

        await expect(inviteToProjectAction("acme", "p1", INITIAL, fd)).resolves.toEqual({
            success: false,
            error: "You're already on this project.",
        });
        expect(db.projectMember.upsert).not.toHaveBeenCalled();
    });
});
