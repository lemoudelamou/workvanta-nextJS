import {
    requireProjectAccess,
    type ProjectAccessResult,
} from "@/lib/auth/members";
import { canProject, ForbiddenError } from "@/lib/auth/permissions";

/**
 * Can this user create/edit/move/delete tasks?
 *
 * Uses the effective project role, so an explicit VIEWER role is respected
 * even for workspace MEMBERs, while MEMBERs keep editing rights on shared
 * (workspace-visible) projects by default.
 */
export function canEditTasks(
    access: Pick<ProjectAccessResult, "effectiveRole">,
) {
    return canProject(access.effectiveRole, "task.edit");
}

export async function requireTaskEditor(
    slug: string,
    projectId: string,
) {
    const access = await requireProjectAccess(slug, projectId);

    if (!canEditTasks(access)) {
        throw new ForbiddenError(
            "You don't have permission to edit tasks in this project.",
        );
    }

    return access;
}
