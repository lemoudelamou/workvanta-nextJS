"use client";

import { InviteForm, type InviteRoleOption } from "@/components/ui/InviteForm";
import { inviteToProjectAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";

interface InviteProjectMemberFormProps {
    slug: string;
    projectId: string;
}

const PROJECT_ROLE_OPTIONS: InviteRoleOption[] = [
    { value: "VIEWER", label: "Viewer" },
    { value: "EDITOR", label: "Editor" },
    { value: "ADMIN", label: "Admin" },
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
            pendingLabel="Sending..."
            successTitle="Done"
            errorTitle="Couldn't add member"
            roleAriaLabel="Project role"
        />
    );
}