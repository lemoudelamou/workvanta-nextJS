"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import ConfirmationModal from "@/components/ui/Modal";
import { deleteProjectAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";

export function DeleteProjectButton({
                                        projectId,
                                        projectName,
                                    }: {
    projectId: string;
    projectName: string;
}) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleClose() {
        if (deleting) return;
        setOpen(false);
        setError(null);
    }

    async function handleDelete() {
        setDeleting(true);
        setError(null);

        try {
            await deleteProjectAction(projectId);
            setOpen(false);
        } catch {
            setError("Couldn't delete the project. Try again.");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-white px-4 text-sm font-semibold text-danger transition hover:-translate-y-0.5 hover:bg-danger/[0.06] hover:shadow-sm dark:bg-slate-900"
            >
                <Trash2 className="size-4" />
                Delete project
            </button>

            <ConfirmationModal
                open={open}
                title="Delete this project?"
                description={
                    <>
                        <strong className="font-semibold text-slate-900 dark:text-slate-200">
                            {projectName}
                        </strong>{" "}
                        will be permanently deleted. This action cannot be
                        undone.
                    </>
                }
                confirmLabel="Delete project"
                loadingLabel="Deleting..."
                loading={deleting}
                error={error}
                onConfirm={handleDelete}
                onClose={handleClose}
            />
        </>
    );
}