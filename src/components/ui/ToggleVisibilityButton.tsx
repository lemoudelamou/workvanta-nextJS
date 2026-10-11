"use client";

import { useTransition } from "react";
import { Globe2, Lock } from "lucide-react";

export function ToggleVisibilityButton({
                                                  visibility,
                                                  onToggle,
                                              }: {
    visibility: "WORKSPACE" | "PRIVATE";
    onToggle: (visibility: "WORKSPACE" | "PRIVATE") => Promise<void>;
}) {
    const [isPending, startTransition] = useTransition();
    const isPrivate = visibility === "PRIVATE";

    function handleClick() {
        startTransition(() => {
            onToggle(isPrivate ? "WORKSPACE" : "PRIVATE");
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            title={
                isPrivate
                    ? "Only invited members can view this project"
                    : "Visible to everyone in the workspace"
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
            {isPrivate ? (
                <Lock className="size-4" />
            ) : (
                <Globe2 className="size-4" />
            )}
            {isPending ? "Updating…" : isPrivate ? "Private" : "Workspace"}
        </button>
    );
}