"use client";

import { useState, useTransition } from "react";

type DeleteAttachmentButtonProps = {
    action: () => Promise<void>;
};

export function DeleteAttachmentButton({ action }: DeleteAttachmentButtonProps) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        if (!window.confirm("Are you sure you want to delete this attachment?")) {
            return;
        }

        setError(null);

        startTransition(async () => {
            try {
                await action();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete attachment.");
            }
        });
    }

    return (
        <span className="inline-flex items-center gap-2">
      <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>

            {error && (
                <span role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
            )}
    </span>
    );
}