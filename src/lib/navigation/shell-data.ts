import { cache } from "react";

import { prisma } from "@/lib/db/prisma";
import {
    canWorkspace,
    visibleProjectsWhere,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";

export type ShellProject = {
    id: string;
    name: string;
    isPrivate: boolean;
};

export type ShellWorkspace = {
    id: string;
    slug: string;
    name: string;
    role: WorkspaceRoleName;
    canCreateProjects: boolean;
    projects: ShellProject[];
};

/** Cap per workspace so a huge workspace can't bloat every page load. */
export const SIDEBAR_PROJECT_LIMIT = 50;

/**
 * Everything the sidebar needs: the user's workspaces and, for each, only
 * the projects this user may open (private projects they're not on are
 * never sent to the browser).
 */
export const getShellWorkspaces = cache(async (userId: string): Promise<ShellWorkspace[]> => {
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: {
            role: true,
            workspace: { select: { id: true, slug: true, name: true } },
        },
        orderBy: { workspace: { name: "asc" } },
    });

    return Promise.all(
        memberships.map(async ({ role, workspace }) => {
            const workspaceRole = role as WorkspaceRoleName;
            const projects = await prisma.project.findMany({
                where: { workspaceId: workspace.id, ...visibleProjectsWhere(userId, workspaceRole) },
                select: { id: true, name: true, visibility: true },
                orderBy: { name: "asc" },
                take: SIDEBAR_PROJECT_LIMIT,
            });

            return {
                ...workspace,
                role: workspaceRole,
                canCreateProjects: canWorkspace(workspaceRole, "projects.create"),
                projects: projects.map((project) => ({
                    id: project.id,
                    name: project.name,
                    isPrivate: project.visibility === "PRIVATE",
                })),
            };
        }),
    );
});
