"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { canWorkspace, isProjectVisibility } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { revalidateAppShell } from "@/lib/navigation/revalidate-shell";

function getText(value: FormDataEntryValue | null) {
    return typeof value === "string" ? value.trim() : "";
}

export async function createProject(
    workspaceId: string,
    formData: FormData,
) {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const name = getText(formData.get("name"));
    const description = getText(formData.get("description"));
    const visibilityValue = getText(formData.get("visibility")) || "WORKSPACE";

    if (
        !name ||
        name.length > 100 ||
        description.length > 500 ||
        !isProjectVisibility(visibilityValue)
    ) {
        return {
            error: "Please enter a valid project name and description.",
        };
    }

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: session.user.id,
            },
        },
        select: {
            role: true,
            workspace: {
                select: {
                    slug: true,
                },
            },
        },
    });

    if (!membership) {
        redirect("/workspace");
    }

    if (!canWorkspace(membership.role, "projects.create")) {
        return {
            error: "Guests can't create projects in this workspace.",
        };
    }

    const normalizedName = name.toLowerCase().trim();
    const { slug } = membership.workspace;

    try {
        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                normalizedName,
                description: description || null,
                visibility: visibilityValue,
                // The creator manages the project they started.
                members: {
                    create: {
                        userId: session.user.id,
                        role: "ADMIN",
                    },
                },
            },
            select: {
                id: true,
            },
        });

        revalidateAppShell();
        revalidatePath(`/workspace/${slug}`);
        revalidatePath("/dashboard");

        redirect(
            `/workspace/${slug}/project/${project.id}`,
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            redirect(
                `/workspace/${slug}/project/new?error=duplicate-name`,
            );
        }

        throw error;
    }
}
