"use client";

import { useState, useTransition } from "react";
import { LogOut, Pencil, Trash2, UsersRound } from "lucide-react";

import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { EditDetailsDialog, type EditDetailsState } from "@/components/ui/EditDetailsDialog";
import ConfirmationModal from "@/components/ui/Modal";
import { deleteWorkspace } from "@/app/(app)/(workspace)/workspace/workspace-actions";
import { leaveWorkspaceAction } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";

type Confirm = "leave" | "delete" | null;

/** Rename, team, leave and delete, tucked into the header's "⋯" menu. */
export function WorkspaceActions({
    workspace,
    updateDetails,
    canEdit,
    canLeave,
    canDelete,
}: {
    workspace: { id: string; slug: string; name: string; description: string | null };
    updateDetails?: (state: EditDetailsState, formData: FormData) => Promise<EditDetailsState>;
    canEdit: boolean;
    canLeave: boolean;
    canDelete: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [confirm, setConfirm] = useState<Confirm>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function run() {
        setError(null);
        startTransition(async () => {
            try {
                const result =
                    confirm === "delete" ? await deleteWorkspace(workspace.id) : await leaveWorkspaceAction(workspace.slug);
                if (result && "error" in result && result.error) setError(result.error);
                else setConfirm(null);
            } catch (err) {
                const digest = (err as { digest?: string } | null)?.digest;
                if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
                setError("Something went wrong. Please try again.");
            }
        });
    }

    const items: ActionMenuItem[] = [
        ...(canEdit && updateDetails
            ? [{ label: "Rename or describe", icon: <Pencil />, onSelect: () => setEditing(true) }]
            : []),
        { label: "Team & invites", icon: <UsersRound />, href: `/workspace/${workspace.slug}/team` },
        ...(canLeave || canDelete ? [{ kind: "separator" as const }] : []),
        ...(canLeave
            ? [{ label: "Leave workspace", icon: <LogOut />, danger: true, onSelect: () => setConfirm("leave") }]
            : []),
        ...(canDelete
            ? [{ label: "Delete workspace", icon: <Trash2 />, danger: true, onSelect: () => setConfirm("delete") }]
            : []),
    ];

    return (
        <>
            <ActionMenu label="Workspace actions" items={items} />

            {canEdit && updateDetails && (
                <EditDetailsDialog
                    open={editing}
                    onClose={() => setEditing(false)}
                    action={updateDetails}
                    title="Workspace details"
                    nameLabel="Workspace name"
                    defaultName={workspace.name}
                    defaultDescription={workspace.description}
                    nameMaxLength={80}
                    descriptionMaxLength={280}
                />
            )}

            <ConfirmationModal
                open={confirm !== null}
                title={confirm === "delete" ? `Delete ${workspace.name}?` : `Leave ${workspace.name}?`}
                description={
                    confirm === "delete"
                        ? "This permanently deletes the workspace, its projects and everyone's access. This can't be undone."
                        : "You'll lose access to every project here and be unassigned from your tasks. You can rejoin only with a new invitation."
                }
                confirmLabel={confirm === "delete" ? "Delete workspace" : "Leave workspace"}
                loading={isPending}
                loadingLabel={confirm === "delete" ? "Deleting..." : "Leaving..."}
                error={error}
                onConfirm={run}
                onClose={() => {
                    if (isPending) return;
                    setError(null);
                    setConfirm(null);
                }}
            />
        </>
    );
}
