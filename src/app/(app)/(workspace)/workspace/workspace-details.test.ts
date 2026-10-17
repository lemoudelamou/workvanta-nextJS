/**
 * @jest-environment node
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireWorkspacePermission } from "@/lib/auth/team";

import { updateWorkspaceDetailsAction } from "./workspace-actions";

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/team", () => ({ requireWorkspacePermission: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { workspace: { update: jest.fn() } },
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

const mockRequire = requireWorkspacePermission as jest.Mock;
const mockUpdate = prisma.workspace.update as unknown as jest.Mock;
const mockRevalidate = revalidatePath as unknown as jest.Mock;

function form(values: Record<string, string>) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    return fd;
}

const run = (values: Record<string, string>) =>
    updateWorkspaceDetailsAction("acme", {}, form(values));

beforeEach(() => {
    mockRequire.mockResolvedValue({ role: "ADMIN", workspace: { id: "w1" } });
    mockUpdate.mockResolvedValue({});
});

afterEach(() => jest.clearAllMocks());

describe("updateWorkspaceDetailsAction", () => {
    it("requires the workspace.update permission", async () => {
        const { ForbiddenError } = jest.requireActual("@/lib/auth/permissions");
        mockRequire.mockRejectedValue(
            new ForbiddenError("Only workspace owners and admins can edit workspace details."),
        );

        await expect(run({ name: "New" })).resolves.toEqual({
            error: "Only workspace owners and admins can edit workspace details.",
        });
        expect(mockRequire).toHaveBeenCalledWith(
            "acme",
            "workspace.update",
            expect.any(String),
        );
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("validates with the same rules as creation", async () => {
        await expect(run({ name: "" })).resolves.toEqual({
            error: "Workspace name is required",
        });
        await expect(run({ name: "x".repeat(81) })).resolves.toEqual({
            error: "Workspace name must be 80 characters or fewer",
        });
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("saves the details and refreshes workspace pages", async () => {
        await expect(run({ name: " Acme Labs ", description: "R&D" })).resolves.toEqual({
            success: true,
        });

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "w1" },
            data: { name: "Acme Labs", normalizedName: "acme labs", description: "R&D" },
        });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme");
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace");
    });

    it("clears an empty description", async () => {
        await run({ name: "Acme", description: "  " });

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ description: null }) }),
        );
    });

    it("reports a duplicate name", async () => {
        const { Prisma } = jest.requireMock("@/generated/prisma/client");
        mockUpdate.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002" }),
        );

        await expect(run({ name: "Acme" })).resolves.toEqual({
            error: "The workspace owner already has a workspace with this name.",
        });
    });
});
