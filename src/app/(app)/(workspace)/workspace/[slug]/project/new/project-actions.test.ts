/**
 * @jest-environment node
 */
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

import { createProject } from "./project-actions";

// ---------- module mocks ----------
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
        workspaceMember: { findUnique: jest.fn() },
        project: { create: jest.fn() },
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
const mockRedirect = redirect as unknown as jest.Mock;
const mockRevalidate = revalidatePath as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const db = prisma as unknown as {
    workspaceMember: { findUnique: jest.Mock };
    project: { create: jest.Mock };
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

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    db.workspaceMember.findUnique.mockResolvedValue({
        role: "MEMBER",
        workspace: { slug: "acme" },
    });
    db.project.create.mockResolvedValue({ id: "p1" });
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
});

// ---------- tests ----------
describe("createProject – authentication", () => {
    it("redirects to /signin without touching the database when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toThrow(
            "NEXT_REDIRECT:/signin",
        );
        expect(db.workspaceMember.findUnique).not.toHaveBeenCalled();
        expect(db.project.create).not.toHaveBeenCalled();
    });
});

describe("createProject – validation", () => {
    const invalid = { error: "Please enter a valid project name and description." };

    it.each([
        ["a missing name", {}],
        ["an empty name", { name: "" }],
        ["a whitespace-only name", { name: "   " }],
        ["a name over 100 characters", { name: "a".repeat(101) }],
        ["a description over 500 characters", { name: "Apollo", description: "d".repeat(501) }],
    ])("returns an error for %s", async (_label, values) => {
        const result = await createProject("w1", makeFormData(values));

        expect(result).toEqual(invalid);
        expect(db.workspaceMember.findUnique).not.toHaveBeenCalled();
        expect(db.project.create).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("treats non-string form entries (files) as empty", async () => {
        const fd = new FormData();
        fd.append("name", new Blob(["x"]), "x.txt");

        await expect(createProject("w1", fd)).resolves.toEqual(invalid);
        expect(db.project.create).not.toHaveBeenCalled();
    });

    it("accepts values exactly at the limits", async () => {
        const name = "a".repeat(100);
        const description = "d".repeat(500);

        await expect(
            createProject("w1", makeFormData({ name, description })),
        ).rejects.toThrow("NEXT_REDIRECT:/workspace/acme/project/p1");

        expect(db.project.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ name, description }) }),
        );
    });

    it("measures length after trimming", async () => {
        const name = `  ${"a".repeat(100)}  `;

        await expect(createProject("w1", makeFormData({ name }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/acme/project/p1",
        );
    });
});

describe("createProject – membership", () => {
    it("looks up the membership by workspace and user", async () => {
        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toThrow();

        expect(db.workspaceMember.findUnique).toHaveBeenCalledWith({
            where: { workspaceId_userId: { workspaceId: "w1", userId: "u1" } },
            select: { role: true, workspace: { select: { slug: true } } },
        });
    });

    it("refuses to let guests create projects", async () => {
        db.workspaceMember.findUnique.mockResolvedValue({
            role: "GUEST",
            workspace: { slug: "acme" },
        });

        await expect(
            createProject("w1", makeFormData({ name: "Apollo" })),
        ).resolves.toEqual({ error: "Guests can't create projects in this workspace." });
        expect(db.project.create).not.toHaveBeenCalled();
    });

    it("redirects to /workspace and creates nothing when the user is not a member", async () => {
        db.workspaceMember.findUnique.mockResolvedValue(null);

        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace",
        );
        expect(db.project.create).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

describe("createProject – creation", () => {
    it("trims input and stores a lowercase normalized name", async () => {
        await expect(
            createProject(
                "w1",
                makeFormData({ name: "  Website ReDesign  ", description: "  Fresh look  " }),
            ),
        ).rejects.toThrow();

        expect(db.project.create).toHaveBeenCalledWith({
            data: {
                workspaceId: "w1",
                name: "Website ReDesign",
                normalizedName: "website redesign",
                description: "Fresh look",
                visibility: "WORKSPACE",
                members: { create: { userId: "u1", role: "ADMIN" } },
            },
            select: { id: true },
        });
    });

    it("can create a private project", async () => {
        await expect(
            createProject("w1", makeFormData({ name: "Apollo", visibility: "PRIVATE" })),
        ).rejects.toThrow();

        expect(db.project.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ visibility: "PRIVATE" }),
            }),
        );
    });

    it("rejects an unknown visibility", async () => {
        await expect(
            createProject("w1", makeFormData({ name: "Apollo", visibility: "PUBLIC" })),
        ).resolves.toEqual({
            error: "Please enter a valid project name and description.",
        });
        expect(db.project.create).not.toHaveBeenCalled();
    });

    it("stores a null description when it is empty or blank", async () => {
        await expect(
            createProject("w1", makeFormData({ name: "Apollo", description: "   " })),
        ).rejects.toThrow();

        expect(db.project.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ description: null }),
            }),
        );
    });

    it("revalidates the workspace and dashboard, then redirects to the new project", async () => {
        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/acme/project/p1",
        );

        // The sidebar lists projects and workspaces, so the shell refreshes too.
        expect(mockRevalidate).toHaveBeenCalledWith("/", "layout");
        expect(mockRevalidate).toHaveBeenCalledTimes(3);
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme");
        expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
        expect(mockRedirect).toHaveBeenCalledTimes(1);
        expect(mockRedirect).toHaveBeenCalledWith("/workspace/acme/project/p1");
    });
});

describe("createProject – error handling", () => {
    it("redirects back to the form on a unique constraint violation (P2002)", async () => {
        db.project.create.mockRejectedValue(knownError("P2002"));

        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/acme/project/new?error=duplicate-name",
        );
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("rethrows other Prisma errors", async () => {
        const error = knownError("P2003");
        db.project.create.mockRejectedValue(error);

        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toBe(error);
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("rethrows unexpected errors", async () => {
        const error = new Error("db down");
        db.project.create.mockRejectedValue(error);

        await expect(createProject("w1", makeFormData({ name: "Apollo" }))).rejects.toBe(error);
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});