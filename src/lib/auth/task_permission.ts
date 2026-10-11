import { requireProjectAccess, type ProjectAccessResult } from "@/lib/auth/members";

export function canEditTasks(access: ProjectAccessResult) {
    return (
        access.workspaceRole === "OWNER" ||
        access.workspaceRole === "ADMIN" ||
        access.projectRole === "ADMIN" ||
        access.projectRole === "EDITOR"
    );
}

export async function requireTaskEditor(slug: string, projectId: string) {
    const access = await requireProjectAccess(slug, projectId);

    if (!canEditTasks(access)) {
        throw new Error("You don't have permission to edit tasks in this project.");
    }

    return access;
}