"use client";

import { useTransition } from "react";
import { Globe2, Lock } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";

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
                    ? "Only people added to this project can see it. Click to share it with the whole workspace."
                    : "Everyone in the workspace can see this project. Click to make it private."
            }
            className={buttonStyles({ variant: "secondary" })}
        >
            {isPrivate ? (
                <Lock className="size-4" aria-hidden="true" />
            ) : (
                <Globe2 className="size-4" aria-hidden="true" />
            )}
            {isPending ? "Updating…" : isPrivate ? "Private" : "Visible to workspace"}
        </button>
    );
}