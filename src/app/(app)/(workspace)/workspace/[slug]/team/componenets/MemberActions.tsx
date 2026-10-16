"use client";

import { Crown, X } from "lucide-react";

import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import {
    revokeInvitationAction,
    transferOwnershipAction,
} from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";

export function TransferOwnershipButton({
    slug,
    memberId,
    memberName,
}: {
    slug: string;
    memberId: string;
    memberName: string;
}) {
    return (
        <ConfirmActionButton
            action={() => transferOwnershipAction(slug, memberId)}
            variant="secondary"
            size="sm"
            ariaLabel={`Make ${memberName} the owner`}
            label={
                <>
                    <Crown className="size-3.5" aria-hidden="true" />
                    Make owner
                </>
            }
            title={`Transfer ownership to ${memberName}?`}
            description="They'll get full control of the workspace, including deleting it. You'll stay on as an admin."
            confirmLabel="Transfer ownership"
            loadingLabel="Transferring..."
        />
    );
}

export function RevokeInvitationButton({
    slug,
    invitationId,
    email,
}: {
    slug: string;
    invitationId: string;
    email: string;
}) {
    return (
        <ConfirmActionButton
            action={() => revokeInvitationAction(slug, invitationId)}
            size="sm"
            ariaLabel={`Cancel invitation for ${email}`}
            label={
                <>
                    <X className="size-3.5" aria-hidden="true" />
                    Cancel
                </>
            }
            title="Cancel this invitation?"
            description={`The invitation link sent to ${email} will stop working.`}
            confirmLabel="Cancel invitation"
            loadingLabel="Cancelling..."
        />
    );
}
