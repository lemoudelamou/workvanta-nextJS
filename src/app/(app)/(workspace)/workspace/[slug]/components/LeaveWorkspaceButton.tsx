"use client";

import { LogOut } from "lucide-react";

import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { leaveWorkspaceAction } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";

export function LeaveWorkspaceButton({
    slug,
    workspaceName,
}: {
    slug: string;
    workspaceName: string;
}) {
    return (
        <ConfirmActionButton
            action={() => leaveWorkspaceAction(slug)}
            label={
                <>
                    <LogOut className="size-4" aria-hidden="true" />
                    Leave workspace
                </>
            }
            title={`Leave ${workspaceName}?`}
            description="You'll lose access to every project in this workspace and be unassigned from your tasks."
            confirmLabel="Leave workspace"
            loadingLabel="Leaving..."
        />
    );
}
