"use client";

import { InviteForm, type InviteRoleOption } from "@/components/ui/InviteForm";
import { PROJECT_ROLE_DESCRIPTIONS } from "@/lib/auth/permissions";
import { inviteToProjectAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";

interface InviteProjectMemberFormProps {
    slug: string;
    projectId: string;
}

const PROJECT_ROLE_OPTIONS: InviteRoleOption[] = [
    { value: "VIEWER", label: "Viewer", description: PROJECT_ROLE_DESCRIPTIONS.VIEWER },
    { value: "EDITOR", label: "Editor", description: PROJECT_ROLE_DESCRIPTIONS.EDITOR },
    { value: "ADMIN", label: "Admin", description: PROJECT_ROLE_DESCRIPTIONS.ADMIN },
];

export function InviteProjectMemberForm({
                                            slug,
                                            projectId,
                                        }: InviteProjectMemberFormProps) {
    const action = inviteToProjectAction.bind(null, slug, projectId);

    return (
        <InviteForm
            action={action}
            roleOptions={PROJECT_ROLE_OPTIONS}
            defaultRole="VIEWER"
            submitLabel="Add to project"
            pendingLabel="Adding..."
            successTitle="Done"
            errorTitle="Couldn't add member"
            roleAriaLabel="Project role"
        />
    );
}