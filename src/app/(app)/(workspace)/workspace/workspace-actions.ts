"use server";

import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { WorkspaceRole } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

function generateWorkspaceSlug(name: string) {
    const baseSlug =
        name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "workspace";

    return `${baseSlug}-${crypto.randomBytes(4).toString("hex")}`;
}

async function requireUser() {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    return session.user;
}

export async function createWorkspace(formData: FormData) {
    const user = await requireUser();

    const validation = createWorkspaceSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
    });

    if (!validation.success) {
        redirect("/workspace/new?error=invalid");
    }

    const { name, description } = validation.data;
    const normalizedName = name.toLowerCase().trim();

    let workspace: { slug: string };

    try {
        workspace = await prisma.workspace.create({
            data: {
                name,
                normalizedName,
                slug: generateWorkspaceSlug(name),
                description: description || null,
                ownerId: user.id,

                members: {
                    create: {
                        userId: user.id,
                        role: WorkspaceRole.OWNER,
                    },
                },
            },
            select: {
                slug: true,
            },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            redirect("/workspace/new?error=duplicate-name");
        }

        throw error;
    }

    revalidatePath("/workspace");
    revalidatePath("/dashboard");

    redirect(`/workspace/${workspace.slug}`);
}

export async function deleteWorkspace(workspaceId: string) {
    const user = await requireUser();

    if (!workspaceId) {
        return {
            error: "A workspace ID is required.",
        };
    }

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: user.id,
            },
        },
        select: {
            role: true,
        },
    });

    if (!membership) {
        return {
            error: "You are not a member of this workspace.",
        };
    }

    if (membership.role !== WorkspaceRole.OWNER) {
        return {
            error: "Only the workspace owner can delete this workspace.",
        };
    }

    await prisma.workspace.delete({
        where: {
            id: workspaceId,
        },
    });

    revalidatePath("/workspace");
    revalidatePath("/dashboard");

    redirect("/workspace");
}

