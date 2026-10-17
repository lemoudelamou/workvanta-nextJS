"use client";

import { useState, useTransition, type ReactNode } from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import Modal from "@/components/ui/Modal";

type ActionResult = { error?: string } | void | undefined;

export type RowAction = {
    label: string;
    icon?: ReactNode;
    danger?: boolean;
    /** Text to put on the clipboard (e.g. an invite link); a path gets this site's address. */
    copy?: string;
    /** A server action to run, after confirmation if `confirm` is set. */
    run?: () => Promise<ActionResult>;
    confirm?: { title: string; description: ReactNode; confirmLabel: string; loadingLabel?: string };
};

/**
 * "⋯" menu for one row of a list (a person, an invitation). Risky actions
 * ask first in the app's dialog and show any error there.
 */
export function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
    const [pending, setPending] = useState<RowAction | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function run(action: RowAction) {
        if (!action.run) return;
        setError(null);
        startTransition(async () => {
            try {
                const result = await action.run!();
                if (result && "error" in result && result.error) {
                    setError(result.error);
                    if (!action.confirm) setPending(action);
                    return;
                }
                setPending(null);
            } catch (err) {
                const digest = (err as { digest?: unknown })?.digest;
                if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
                setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
                if (!action.confirm) setPending(action);
            }
        });
    }

    async function copy(action: RowAction) {
        try {
            const text = action.copy!.startsWith("/") ? `${window.location.origin}${action.copy}` : action.copy!;
            await navigator.clipboard.writeText(text);
            setCopied(action.label);
            setTimeout(() => setCopied(null), 1800);
        } catch {
            setError("Couldn't copy. Your browser blocked the clipboard.");
        }
    }

    const items: ActionMenuItem[] = [];
    actions.forEach((action, index) => {
        if (action.danger && index > 0 && !actions[index - 1].danger) items.push({ kind: "separator" });
        items.push({
            label: copied === action.label ? "Copied" : action.label,
            icon: action.icon,
            danger: action.danger,
            onSelect: () => {
                if (action.copy) void copy(action);
                else if (action.confirm) {
                    setError(null);
                    setPending(action);
                } else run(action);
            },
        });
    });

    return (
        <>
            <ActionMenu label={label} items={items} variant="ghost" />
            {copied && (
                <span role="status" className="sr-only">
                    Copied to clipboard
                </span>
            )}
            <Modal
                open={!!pending}
                title={pending?.confirm?.title ?? "Something went wrong"}
                description={pending?.confirm?.description ?? ""}
                confirmLabel={pending?.confirm?.confirmLabel ?? "Try again"}
                loading={isPending}
                loadingLabel={pending?.confirm?.loadingLabel ?? "Working..."}
                error={error}
                onConfirm={() => {
                    if (pending) run(pending);
                }}
                onClose={() => {
                    if (!isPending) setPending(null);
                }}
            />
        </>
    );
}
