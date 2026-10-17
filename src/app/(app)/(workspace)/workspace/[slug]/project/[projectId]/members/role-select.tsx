"use client";

import { RoleSelect, type RoleOption } from "@/components/ui/RoleSelect";
import { updateProjectMemberRoleAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";

type ProjectRole = "ADMIN" | "EDITOR" | "VIEWER";

const PROJECT_ROLE_OPTIONS: RoleOption<ProjectRole>[] = [
    { value: "ADMIN", label: "Admin", dotColor: "bg-brand" },
    { value: "EDITOR", label: "Editor", dotColor: "bg-status-done" },
    { value: "VIEWER", label: "Viewer", dotColor: "bg-muted-foreground/60" },
];

interface ProjectMemberRoleSelectProps {
    slug: string;
    projectId: string;
    memberId: string;
    currentRole: ProjectRole;
}

export function ProjectMemberRoleSelect({
                                            slug,
                                            projectId,
                                            memberId,
                                            currentRole,
                                        }: ProjectMemberRoleSelectProps) {
    return (
        <RoleSelect
            value={currentRole}
    options={PROJECT_ROLE_OPTIONS}
    ariaLabel="Project role"
    onChange={(nextRole) =>
    updateProjectMemberRoleAction(
        slug,
        projectId,
        memberId,
        nextRole,
    )
}
    />
);
}