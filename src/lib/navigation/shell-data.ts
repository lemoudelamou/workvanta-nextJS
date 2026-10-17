import { cache } from "react";

import { prisma } from "@/lib/db/prisma";
import { myTasksWhere } from "@/lib/tasks/my-tasks";
import {
    canWorkspace,
    visibleProjectsWhere,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";

export type ShellProject = {
    id: string;
    name: string;
    isPrivate: boolean;
    /** Tasks not yet done, shown as a small count in the sidebar. */
    openTasks: number;
};

export type ShellWorkspace = {
    id: string;
    slug: string;
    name: string;
    role: WorkspaceRoleName;
    canCreateProjects: boolean;
    memberCount: number;
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
            workspace: {
                select: { id: true, slug: true, name: true, _count: { select: { members: true } } },
            },
        },
        orderBy: { workspace: { name: "asc" } },
    });

    const workspaces = await Promise.all(
        memberships.map(async ({ role, workspace }) => {
            const workspaceRole = role as WorkspaceRoleName;
            const projects = await prisma.project.findMany({
                where: { workspaceId: workspace.id, ...visibleProjectsWhere(userId, workspaceRole) },
                select: { id: true, name: true, visibility: true },
                orderBy: { name: "asc" },
                take: SIDEBAR_PROJECT_LIMIT,
            });

            return {
                id: workspace.id,
                slug: workspace.slug,
                name: workspace.name,
                role: workspaceRole,
                canCreateProjects: canWorkspace(workspaceRole, "projects.create"),
                memberCount: workspace._count.members,
                projects: projects.map((project) => ({
                    id: project.id,
                    name: project.name,
                    isPrivate: project.visibility === "PRIVATE",
                    openTasks: 0,
                })),
            };
        }),
    );

    // One grouped count for every listed project's unfinished tasks.
    const projectIds = workspaces.flatMap((w) => w.projects.map((p) => p.id));
    if (projectIds.length) {
        const open = await prisma.task.groupBy({
            by: ["projectId"],
            where: { projectId: { in: projectIds }, status: { not: "DONE" } },
            _count: { _all: true },
        });
        const counts = new Map(open.map((row) => [row.projectId, row._count._all]));
        for (const workspace of workspaces) {
            for (const project of workspace.projects) project.openTasks = counts.get(project.id) ?? 0;
        }
    }

    return workspaces;
});

/** Open tasks assigned to the user that they can still open (My tasks). */
export const getMyOpenTaskCount = cache(async (userId: string): Promise<number> => {
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true, role: true },
    });
    if (!memberships.length) return 0;

    return prisma.task.count({
        where: myTasksWhere(
            userId,
            memberships.map((m) => ({ workspaceId: m.workspaceId, role: m.role as WorkspaceRoleName })),
        ),
    });
});
