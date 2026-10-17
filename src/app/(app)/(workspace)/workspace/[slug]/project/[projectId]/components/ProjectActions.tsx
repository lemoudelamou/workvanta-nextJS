"use client";

import { useState, useTransition } from "react";
import { Globe2, Lock, Pencil, Tag, Trash2, UsersRound } from "lucide-react";

import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { EditDetailsDialog, type EditDetailsState } from "@/components/ui/EditDetailsDialog";
import ConfirmationModal from "@/components/ui/Modal";
import { ManageLabelsDialog, type ManagedLabel } from "./ManageLabelsDialog";
import { deleteProjectAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";

/** Rename, members, visibility and delete, in the project header's "⋯" menu. */
export function ProjectActions({
    project,
    membersHref,
    updateDetails,
    setVisibility,
    canDelete,
    labels,
}: {
    project: { id: string; name: string; description: string | null; visibility: "WORKSPACE" | "PRIVATE" };
    membersHref: string;
    /** Present for people who may rename the project and change who sees it. */
    updateDetails?: (state: EditDetailsState, formData: FormData) => Promise<EditDetailsState>;
    setVisibility?: (visibility: "WORKSPACE" | "PRIVATE") => Promise<void>;
    canDelete: boolean;
    /** Present for people who may manage the project's labels. */
    labels?: { slug: string; list: ManagedLabel[] };
}) {
    const [editing, setEditing] = useState(false);
    const [managingLabels, setManagingLabels] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const isPrivate = project.visibility === "PRIVATE";

    function remove() {
        setError(null);
        startTransition(async () => {
            try {
                await deleteProjectAction(project.id);
                setDeleting(false);
            } catch (err) {
                const digest = (err as { digest?: string } | null)?.digest;
                if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
                setError("Couldn't delete the project. Try again.");
            }
        });
    }

    const items: ActionMenuItem[] = [
        ...(updateDetails ? [{ label: "Rename or describe", icon: <Pencil />, onSelect: () => setEditing(true) }] : []),
        { label: "Members & access", icon: <UsersRound />, href: membersHref },
        ...(labels ? [{ label: "Manage labels", icon: <Tag />, onSelect: () => setManagingLabels(true) }] : []),
        ...(setVisibility
            ? [
                  {
                      label: isPrivate ? "Share with workspace" : "Make private",
                      icon: isPrivate ? <Globe2 /> : <Lock />,
                      onSelect: () => startTransition(() => setVisibility(isPrivate ? "WORKSPACE" : "PRIVATE")),
                  },
              ]
            : []),
        ...(canDelete
            ? [
                  { kind: "separator" as const },
                  { label: "Delete project", icon: <Trash2 />, danger: true, onSelect: () => setDeleting(true) },
              ]
            : []),
    ];

    return (
        <>
            <ActionMenu label="Project actions" items={items} />

            {updateDetails && (
                <EditDetailsDialog
                    open={editing}
                    onClose={() => setEditing(false)}
                    action={updateDetails}
                    title="Project details"
                    nameLabel="Project name"
                    defaultName={project.name}
                    defaultDescription={project.description}
                    nameMaxLength={100}
                    descriptionMaxLength={500}
                />
            )}

            {labels && (
                <ManageLabelsDialog
                    open={managingLabels}
                    onClose={() => setManagingLabels(false)}
                    slug={labels.slug}
                    projectId={project.id}
                    labels={labels.list}
                />
            )}

            {canDelete && (
                <ConfirmationModal
                    open={deleting}
                    title="Delete this project?"
                    description={
                        <>
                            <strong className="font-semibold text-foreground">{project.name}</strong> and all of its tasks
                            will be permanently deleted. This can&apos;t be undone.
                        </>
                    }
                    confirmLabel="Delete project"
                    loading={isPending}
                    loadingLabel="Deleting..."
                    error={error}
                    onConfirm={remove}
                    onClose={() => {
                        if (isPending) return;
                        setError(null);
                        setDeleting(false);
                    }}
                />
            )}
        </>
    );
}
