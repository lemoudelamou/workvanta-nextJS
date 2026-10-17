import type { Metadata } from "next";

import { requireMembership } from "@/lib/auth/team";
import { requireProjectAccess } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { pageTitle } from "./page-title";

const FALLBACK: Metadata = { title: "Workvanta" };

/**
 * Titles that name a workspace, project or task use the same access checks
 * as the page, so a name never shows in the tab of someone who can't open
 * it; they just see "Workvanta".
 */
async function safely(load: () => Promise<Metadata>): Promise<Metadata> {
    try {
        return await load();
    } catch {
        return FALLBACK;
    }
}

export function workspaceTitle(slug: string, prefix?: string) {
    return safely(async () => {
        const { workspace } = await requireMembership(slug);
        return pageTitle(...(prefix ? [prefix] : []), workspace.name);
    });
}

export function projectTitle(slug: string, projectId: string, prefix?: string) {
    return safely(async () => {
        const { project } = await requireProjectAccess(slug, projectId);
        return pageTitle(...(prefix ? [prefix] : []), project.name);
    });
}

export function taskTitle(slug: string, projectId: string, taskId: string) {
    return safely(async () => {
        const { project } = await requireProjectAccess(slug, projectId);
        const task = await prisma.task.findFirst({
            where: { id: taskId, projectId: project.id },
            select: { title: true },
        });
        return task ? pageTitle(task.title, project.name) : FALLBACK;
    });
}
