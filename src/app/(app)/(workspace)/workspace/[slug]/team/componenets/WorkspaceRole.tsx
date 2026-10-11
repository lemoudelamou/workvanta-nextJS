"use client";

import { RoleSelect, type RoleOption } from "@/components/ui/RoleSelect";
import { updateTeamRole } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";


type EditableWorkspaceRole = "ADMIN" | "MEMBER" | "GUEST";

const WORKSPACE_ROLE_OPTIONS: RoleOption<EditableWorkspaceRole>[] = [
    { value: "ADMIN", label: "Admin", dotColor: "bg-blue-500" },
    { value: "MEMBER", label: "Member", dotColor: "bg-slate-400" },
    { value: "GUEST", label: "Guest", dotColor: "bg-amber-500" },
];

interface WorkspaceMemberRoleSelectProps {
    slug: string;
    memberId: string;
    currentRole: EditableWorkspaceRole;
}

export function WorkspaceMemberRoleSelect({
                                              slug,
                                              memberId,
                                              currentRole,
                                          }: WorkspaceMemberRoleSelectProps) {
    return (
        <RoleSelect
            value={currentRole}
            options={WORKSPACE_ROLE_OPTIONS}
            ariaLabel="Workspace role"
            onChange={(nextRole) =>
                updateTeamRole(slug, memberId, nextRole)
            }
        />
    );
}