"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";

import { deleteAccount } from "./actions";

type BlockingWorkspace = { name: string; slug: string; memberCount: number };

export default function DeleteAccountScreen({
    blockingWorkspaces = [],
    soloWorkspaceNames = [],
}: {
    blockingWorkspaces?: BlockingWorkspace[];
    soloWorkspaceNames?: string[];
}) {
    const isBlocked = blockingWorkspaces.length > 0;
    const [confirmation, setConfirmation] = useState("");
    const [isDeletingAccount, startDeletingAccount] =
        useTransition();
    const [errorMessage, setErrorMessage] = useState("");

    function handleDeleteAccount() {
        if (confirmation !== "DELETE") {
            setErrorMessage(
                'Type "DELETE" to confirm account deletion.',
            );
            return;
        }

        setErrorMessage("");

        startDeletingAccount(async () => {
            try {
                const result = await deleteAccount(confirmation);

                if (result?.error) {
                    setErrorMessage(result.error);
                }
            } catch (error) {
                console.error(error);

                setErrorMessage(
                    "Something went wrong while deleting your account. Please try again.",
                );
            }
        });
    }

    return (
        <main className="px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-2xl">
                <Link
                    href="/settings"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                >
                    <ArrowLeft className="size-4" />
                    Back to Settings
                </Link>

                <div className="overflow-hidden rounded-xl border border-danger/30 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-white/[0.035] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                    <div className="border-b border-danger/30 bg-danger/[0.06] p-6 sm:p-7">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-danger/30 bg-white text-danger">
                                <AlertTriangle className="size-5" />
                            </div>

                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-danger">
                                    Danger Zone
                                </p>

                                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                                    Delete your account
                                </h1>

                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    This permanently removes your
                                    Workvanta account and personal data.
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 p-6 sm:p-7">
                        <div className="rounded-xl border border-slate-200/80 bg-white/60 p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                            <h2 className="text-sm font-semibold text-foreground">
                                Before you continue
                            </h2>

                            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                                <li>
                                    • Your name, email, password, linked
                                    sign-ins and two-factor settings will
                                    be erased.
                                </li>
                                <li>
                                    • You&apos;ll be removed from every
                                    workspace and unassigned from your
                                    tasks.
                                </li>
                                <li>
                                    • Tasks and comments you wrote in
                                    shared workspaces stay for your team,
                                    shown as &ldquo;Deleted user&rdquo;.
                                </li>
                                {soloWorkspaceNames.length > 0 && (
                                    <li>
                                        • Workspaces only you use will be
                                        deleted:{" "}
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {soloWorkspaceNames.join(", ")}
                                        </span>
                                        .
                                    </li>
                                )}
                                <li>
                                    • You will be signed out everywhere
                                    immediately.
                                </li>
                            </ul>
                        </div>

                        {isBlocked && (
                            <div
                                role="alert"
                                className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/[0.08]"
                            >
                                <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    Hand over your workspaces first
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                                    You own workspaces that other people
                                    use. Make someone else the owner from
                                    the Team page, or delete the workspace,
                                    before deleting your account.
                                </p>
                                <ul className="mt-3 space-y-1.5">
                                    {blockingWorkspaces.map((workspace) => (
                                        <li key={workspace.slug}>
                                            <Link
                                                href={`/workspace/${workspace.slug}/team`}
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
                                            >
                                                {workspace.name}
                                                <span className="font-normal text-amber-700 dark:text-amber-400">
                                                    · {workspace.memberCount} members
                                                </span>
                                                <ArrowRight className="size-3.5" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="delete-confirmation"
                                className="text-sm font-semibold text-foreground"
                            >
                                Type{" "}
                                <span className="font-mono text-danger">
                                    DELETE
                                </span>{" "}
                                to confirm
                            </label>

                            <input
                                id="delete-confirmation"
                                type="text"
                                value={confirmation}
                                onChange={(event) => {
                                    setConfirmation(event.target.value);
                                    setErrorMessage("");
                                }}
                                disabled={isDeletingAccount || isBlocked}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="DELETE"
                                className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-danger focus:ring-4 focus:ring-danger/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-danger/40"
                            />
                        </div>

                        {errorMessage && (
                            <div
                                role="alert"
                                className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm leading-6 text-danger"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-white/[0.08]">
                            <Link
                                href="/settings"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
                            >
                                Cancel
                            </Link>

                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={
                                    isDeletingAccount ||
                                    isBlocked ||
                                    confirmation !== "DELETE"
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:border-danger hover:bg-danger disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:border-white/[0.08] dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500"
                            >
                                <Trash2 className="size-4" />

                                {isDeletingAccount
                                    ? "Deleting account..."
                                    : "Delete account"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
