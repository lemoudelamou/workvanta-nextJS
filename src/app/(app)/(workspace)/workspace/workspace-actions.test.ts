/**
 * @jest-environment node
 */
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

import { createWorkspace, deleteWorkspace } from "./workspace-actions";

// ---------- module mocks ----------
jest.mock("node:crypto", () => ({
    __esModule: true,
    default: {
        // deterministic suffix: "a1b2c3d4"
        randomBytes: jest.fn(() => Buffer.from("a1b2c3d4", "hex")),
    },
}));
jest.mock("next/navigation", () => ({
    // The real redirect() throws; mirroring that stops execution like production
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        workspace: { create: jest.fn(), delete: jest.fn() },
        workspaceMember: { findUnique: jest.fn() },
    },
}));
jest.mock("@/lib/validations/workspace", () => ({
    createWorkspaceSchema: { safeParse: jest.fn() },
}));
jest.mock("@/generated/prisma/enums", () => ({
    WorkspaceRole: { OWNER: "OWNER", ADMIN: "ADMIN", MEMBER: "MEMBER", GUEST: "GUEST" },
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
const mockRedirect = redirect as unknown as jest.Mock;
const mockRevalidate = revalidatePath as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockSafeParse = createWorkspaceSchema.safeParse as unknown as jest.Mock;
const db = prisma as unknown as {
    workspace: { create: jest.Mock; delete: jest.Mock };
    workspaceMember: { findUnique: jest.Mock };
};

// ---------- helpers ----------
function makeFormData(values: Record<string, string> = {}) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => fd.append(key, value));
    return fd;
}

function knownError(code: string) {
    const Ctor = Prisma.PrismaClientKnownRequestError as unknown as new (
        message: string,
        opts: { code: string },
    ) => Error;
    return new Ctor("prisma error", { code });
}

function validData(name = "Acme Studio", description: string | undefined = "Our team") {
    mockSafeParse.mockReturnValue({ success: true, data: { name, description } });
}

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    validData();
    db.workspace.create.mockResolvedValue({ slug: "acme-studio-a1b2c3d4" });
    db.workspace.delete.mockResolvedValue({});
    db.workspaceMember.findUnique.mockResolvedValue({ role: "OWNER" });
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
});

// ---------- createWorkspace ----------
describe("createWorkspace – authentication and validation", () => {
    it("redirects to /signin without touching the database when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(createWorkspace(makeFormData({ name: "Acme" }))).rejects.toThrow(
            "NEXT_REDIRECT:/signin",
        );
        expect(mockSafeParse).not.toHaveBeenCalled();
        expect(db.workspace.create).not.toHaveBeenCalled();
    });

    it("passes the raw form fields to the schema", async () => {
        await expect(
            createWorkspace(makeFormData({ name: "Acme", description: "Team" })),
        ).rejects.toThrow();

        expect(mockSafeParse).toHaveBeenCalledWith({ name: "Acme", description: "Team" });
    });

    it("passes null for missing fields so the schema can reject them", async () => {
        await expect(createWorkspace(makeFormData())).rejects.toThrow();

        expect(mockSafeParse).toHaveBeenCalledWith({ name: null, description: null });
    });

    it("redirects to the form with an invalid error and creates nothing", async () => {
        mockSafeParse.mockReturnValue({ success: false });

        await expect(createWorkspace(makeFormData({ name: "" }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/new?error=invalid",
        );
        expect(db.workspace.create).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

describe("createWorkspace – creation", () => {
    it("creates the workspace with the current user as owner and first member", async () => {
        await expect(createWorkspace(makeFormData())).rejects.toThrow();

        expect(db.workspace.create).toHaveBeenCalledWith({
            data: {
                name: "Acme Studio",
                normalizedName: "acme studio",
                slug: "acme-studio-a1b2c3d4",
                description: "Our team",
                ownerId: "u1",
                members: { create: { userId: "u1", role: "OWNER" } },
            },
            select: { slug: true },
        });
    });

    it("stores a lowercase, trimmed normalized name", async () => {
        validData("  Acme STUDIO  ");

        await expect(createWorkspace(makeFormData())).rejects.toThrow();

        expect(db.workspace.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ normalizedName: "acme studio" }),
            }),
        );
    });

    it.each([
        ["an empty description", ""],
        ["an undefined description", undefined],
    ])("stores a null description for %s", async (_label, description) => {
        mockSafeParse.mockReturnValue({
            success: true,
            data: { name: "Acme", description },
        });

        await expect(createWorkspace(makeFormData())).rejects.toThrow();

        expect(db.workspace.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ description: null }),
            }),
        );
    });

    it("revalidates the workspace list and dashboard, then redirects to the new workspace", async () => {
        db.workspace.create.mockResolvedValue({ slug: "my-slug" });

        await expect(createWorkspace(makeFormData())).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/my-slug",
        );

        // The sidebar lists projects and workspaces, so the shell refreshes too.
        expect(mockRevalidate).toHaveBeenCalledWith("/", "layout");
        expect(mockRevalidate).toHaveBeenCalledTimes(3);
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace");
        expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
        expect(mockRedirect).toHaveBeenCalledTimes(1);
    });
});

describe("createWorkspace – slug generation", () => {
    const slugFor = async (name: string) => {
        validData(name);
        await expect(createWorkspace(makeFormData())).rejects.toThrow();
        return db.workspace.create.mock.calls[0][0].data.slug as string;
    };

    it.each([
        ["Acme Studio", "acme-studio-a1b2c3d4"],
        ["  Hello,   World!!  ", "hello-world-a1b2c3d4"],
        ["--Already--Dashed--", "already-dashed-a1b2c3d4"],
        ["Café 42", "caf-42-a1b2c3d4"],
        ["!!!", "workspace-a1b2c3d4"],
        ["日本語", "workspace-a1b2c3d4"],
    ])("turns %j into %j", async (name, expected) => {
        expect(await slugFor(name)).toBe(expected);
    });

    it("limits the base slug to 40 characters before the random suffix", async () => {
        expect(await slugFor("a".repeat(100))).toBe(`${"a".repeat(40)}-a1b2c3d4`);
    });
});

describe("createWorkspace – error handling", () => {
    it("redirects back to the form on a unique constraint violation (P2002)", async () => {
        db.workspace.create.mockRejectedValue(knownError("P2002"));

        await expect(createWorkspace(makeFormData())).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/new?error=duplicate-name",
        );
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("rethrows other Prisma errors", async () => {
        const error = knownError("P2003");
        db.workspace.create.mockRejectedValue(error);

        await expect(createWorkspace(makeFormData())).rejects.toBe(error);
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("rethrows unexpected errors", async () => {
        const error = new Error("db down");
        db.workspace.create.mockRejectedValue(error);

        await expect(createWorkspace(makeFormData())).rejects.toBe(error);
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});

// ---------- deleteWorkspace ----------
describe("deleteWorkspace", () => {
    it("redirects to /signin without touching the database when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(deleteWorkspace("w1")).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(db.workspaceMember.findUnique).not.toHaveBeenCalled();
        expect(db.workspace.delete).not.toHaveBeenCalled();
    });

    it("returns an error when no workspace id is given", async () => {
        await expect(deleteWorkspace("")).resolves.toEqual({
            error: "A workspace ID is required.",
        });
        expect(db.workspaceMember.findUnique).not.toHaveBeenCalled();
        expect(db.workspace.delete).not.toHaveBeenCalled();
    });

    it("looks up the membership by workspace and user", async () => {
        await expect(deleteWorkspace("w1")).rejects.toThrow();

        expect(db.workspaceMember.findUnique).toHaveBeenCalledWith({
            where: { workspaceId_userId: { workspaceId: "w1", userId: "u1" } },
            select: { role: true },
        });
    });

    it("returns an error and deletes nothing when the user is not a member", async () => {
        db.workspaceMember.findUnique.mockResolvedValue(null);

        await expect(deleteWorkspace("w1")).resolves.toEqual({
            error: "You are not a member of this workspace.",
        });
        expect(db.workspace.delete).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it.each(["ADMIN", "MEMBER", "GUEST"])(
        "returns an error and deletes nothing for a %s",
        async (role) => {
            db.workspaceMember.findUnique.mockResolvedValue({ role });

            await expect(deleteWorkspace("w1")).resolves.toEqual({
                error: "Only the workspace owner can delete this workspace.",
            });
            expect(db.workspace.delete).not.toHaveBeenCalled();
            expect(mockRevalidate).not.toHaveBeenCalled();
        },
    );

    it("deletes the workspace, revalidates, and redirects to /workspace for the owner", async () => {
        await expect(deleteWorkspace("w1")).rejects.toThrow("NEXT_REDIRECT:/workspace");

        expect(db.workspace.delete).toHaveBeenCalledWith({ where: { id: "w1" } });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace");
        expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
        // The sidebar lists projects and workspaces, so the shell refreshes too.
        expect(mockRevalidate).toHaveBeenCalledWith("/", "layout");
        expect(mockRevalidate).toHaveBeenCalledTimes(3);
    });

    it("propagates database errors without revalidating or redirecting", async () => {
        const error = new Error("db down");
        db.workspace.delete.mockRejectedValue(error);

        await expect(deleteWorkspace("w1")).rejects.toBe(error);
        expect(mockRevalidate).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});