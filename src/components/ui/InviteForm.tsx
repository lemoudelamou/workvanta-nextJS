"use client";

import { useActionState, useState } from "react";
import { ChevronDown, Loader2, Mail, Send } from "lucide-react";

import { AlertMessage } from "@/components/ui/AlertMessage";
import type { InviteFormState } from "@/lib/types/invite-form-state";

export interface InviteRoleOption {
    value: string;
    label: string;
    /** What this role can do, shown under the form when it's picked. */
    description?: string;
}

interface InviteFormProps {
    action: (state: InviteFormState, formData: FormData) => Promise<InviteFormState>;
    roleOptions: InviteRoleOption[];
    defaultRole: string;
    submitLabel?: string;
    pendingLabel?: string;
    successTitle?: string;
    errorTitle?: string;
    roleAriaLabel?: string;
}

const initialState: InviteFormState = { success: false };

/**
 * Email + role + send, in one bar. Knows nothing about workspaces or
 * projects: bind it to a server action and a role list per context.
 */
export function InviteForm({
    action,
    roleOptions,
    defaultRole,
    submitLabel = "Send invitation",
    pendingLabel = "Sending...",
    successTitle = "Invitation sent",
    errorTitle = "Invitation not sent",
    roleAriaLabel = "Invitation role",
}: InviteFormProps) {
    const [state, formAction, isPending] = useActionState(action, initialState);
    const [role, setRole] = useState(defaultRole);
    const picked = roleOptions.find((option) => option.value === role);

    return (
        <div>
            <form
                action={formAction}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-1.5 transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 sm:flex-row sm:items-center"
            >
                <div className="relative min-w-0 flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="email"
                        name="email"
                        required
                        autoComplete="off"
                        placeholder="name@company.com"
                        aria-label="Email address"
                        disabled={isPending}
                        className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 sm:flex-none">
                        <select
                            name="role"
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                            disabled={isPending}
                            aria-label={roleAriaLabel}
                            className="h-10 w-full cursor-pointer appearance-none rounded-xl bg-foreground/[0.05] pl-3.5 pr-8 text-sm font-medium text-foreground outline-none transition-colors hover:bg-foreground/[0.08] focus-visible:ring-2 focus-visible:ring-brand dark:[color-scheme:dark]"
                        >
                            {roleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#0f1115]"
                    >
                        {isPending ? (
                            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                        ) : (
                            <Send className="size-4" aria-hidden="true" />
                        )}
                        {isPending ? pendingLabel : submitLabel}
                    </button>
                </div>
            </form>

            {picked?.description && (
                <p className="mt-2 px-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{picked.label}:</span> {picked.description}
                </p>
            )}

            {state.error && <AlertMessage variant="error" title={errorTitle} message={state.error} className="mt-3" />}
            {state.success && state.message && (
                <AlertMessage variant="success" title={successTitle} message={state.message} className="mt-3" />
            )}
        </div>
    );
}
