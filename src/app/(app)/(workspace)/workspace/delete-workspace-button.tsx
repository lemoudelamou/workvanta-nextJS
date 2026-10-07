"use client";

import { useCallback, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import  Modal  from "@/components/ui/Modal";
import { deleteWorkspace } from "@/app/(app)/(workspace)/workspace/workspace-actions";

type DeleteWorkspaceButtonProps = {
    workspaceId: string;
    workspaceName: string;
};

export function DeleteWorkspaceButton({ workspaceId, workspaceName }: DeleteWorkspaceButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const closeModal = useCallback(() => {
        if (!isPending) {
            setError(null);
            setIsOpen(false);
        }
    }, [isPending]);

    const handleDelete = useCallback(() => {
        setError(null);
        startTransition(async () => {
            const result = await deleteWorkspace(workspaceId);
            if (result?.error) setError(result.error);
        });
    }, [workspaceId]);

    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-400/20 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10">
                <Trash2 className="size-4" /> Delete workspace
            </button>
            <Modal
                open={isOpen}
                title={`Delete ${workspaceName}?`}
                description={<>This permanently deletes the workspace, its projects, and all member access. This action cannot be undone.</>}
                confirmLabel="Delete workspace"
                loading={isPending}
                loadingLabel="Deleting workspace..."
                error={error}
                onConfirm={handleDelete}
                onClose={closeModal}
            />
        </>
    );
}
