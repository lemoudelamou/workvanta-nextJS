"use client";

import { InviteForm, type InviteRoleOption } from "@/components/ui/InviteForm";
import { inviteTeamAction } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";

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
        { value: "MEMBER", label: "Member" },
        ...(canInviteAdmin
            ? [{ value: "ADMIN", label: "Admin" }]
            : []),
        { value: "GUEST", label: "Guest" },
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