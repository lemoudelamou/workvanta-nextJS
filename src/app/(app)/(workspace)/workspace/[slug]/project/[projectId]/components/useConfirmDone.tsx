"use client";

import { useState } from "react";

import Modal from "@/components/ui/Modal";

type DoneCheck = {
    title: string;
    openBlockers: number;
    /** Go ahead with the move. */
    confirm: () => void;
    /** Put things back; called when the person backs out. */
    cancel?: () => void;
};

/**
 * Dependencies don't lock a task, but marking one done while it still
 * waits on open tasks is usually a slip, so that one move asks first.
 * Render `dialog` once; call `guard` when a task is about to become done.
 */
export function useConfirmDone() {
    const [pending, setPending] = useState<DoneCheck | null>(null);

    function guard(check: DoneCheck) {
        if (check.openBlockers > 0) setPending(check);
        else check.confirm();
    }

    function settle(go: boolean) {
        const check = pending;
        setPending(null);
        if (go) check?.confirm();
        else check?.cancel?.();
    }

    const count = pending?.openBlockers ?? 0;
    const dialog = (
        <Modal
            open={pending !== null}
            title="Mark as done?"
            description={
                <>
                    “{pending?.title}” is still waiting on {count} open {count === 1 ? "task" : "tasks"}.
                </>
            }
            confirmLabel="Mark done anyway"
            onConfirm={() => settle(true)}
            onClose={() => settle(false)}
        />
    );

    return { guard, dialog };
}
