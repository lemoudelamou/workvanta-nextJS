"use client";

import { InviteForm, type InviteRoleOption } from "@/components/ui/InviteForm";
import { inviteTeamAction } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";
import { WORKSPACE_ROLE_DESCRIPTIONS } from "@/lib/auth/permissions";

interface InviteTeamFormProps {
    slug: string;
    canInviteAdmin: boolean;
}

export function InviteTeamForm({
                                     slug,
                                     canInviteAdmin,
                                 }: InviteTeamFormProps) {
    const action = inviteTeamAction.bind(null, slug);

    const roleOptions: InviteRoleOption[] = [
        { value: "MEMBER", label: "Member", description: WORKSPACE_ROLE_DESCRIPTIONS.MEMBER },
        ...(canInviteAdmin
            ? [{ value: "ADMIN", label: "Admin", description: WORKSPACE_ROLE_DESCRIPTIONS.ADMIN }]
            : []),
        { value: "GUEST", label: "Guest", description: WORKSPACE_ROLE_DESCRIPTIONS.GUEST },
    ];

    return (
        <InviteForm
            action={action}
            roleOptions={roleOptions}
            defaultRole="MEMBER"
            roleAriaLabel="Invitation role"
        />
    );
}