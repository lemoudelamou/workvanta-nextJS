"use client";

import { Mail, Send } from "lucide-react";
import { useActionState } from "react";

import { AlertMessage } from "@/components/ui/AlertMessage";
import type { InviteFormState } from "@/lib/types/invite-form-state";

export interface InviteRoleOption {
    value: string;
    label: string;
}

interface InviteFormProps {
    action: (
        state: InviteFormState,
        formData: FormData,
    ) => Promise<InviteFormState>;
    roleOptions: InviteRoleOption[];
    defaultRole: string;
    submitLabel?: string;
    pendingLabel?: string;
    successTitle?: string;
    errorTitle?: string;
    roleAriaLabel?: string;
}

const initialState: InviteFormState = {
    success: false,
};

const fieldClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/20 dark:focus:bg-white/[0.06]";

const selectClass =
    "h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/20 dark:focus:bg-white/[0.06]";

const optionClass =
    "bg-white text-slate-900 dark:bg-zinc-900 dark:text-white";

const primaryButton =
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand dark:text-black dark:hover:bg-white/90";

/**
 * Generic invite form: email + role dropdown + submit. Knows nothing
 * about workspaces or projects — bind it to a specific server action
 * and role list per context (see InviteMemberForm, InviteProjectMemberForm).
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
    const [state, formAction, isPending] = useActionState(
        action,
        initialState,
    );

    return (
        <div>
            <form
                action={formAction}
                className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
                {/* Email */}
                <div className="relative min-w-0 flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />

                    <input
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        placeholder="teammate@example.com"
                        className={fieldClass}
                        disabled={isPending}
                    />
                </div>

                {/* Role */}
                <select
                    name="role"
                    defaultValue={defaultRole}
                    disabled={isPending}
                    aria-label={roleAriaLabel}
                    className={selectClass}
                >
                    {roleOptions.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            className={optionClass}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isPending}
                    className={primaryButton}
                >
                    <Send className="size-4" />
                    {isPending ? pendingLabel : submitLabel}
                </button>
            </form>

            {state.error && (
                <AlertMessage
                    variant="error"
                    title={errorTitle}
                    message={state.error}
                    className="mt-4"
                />
            )}

            {state.success && state.message && (
                <AlertMessage
                    variant="success"
                    title={successTitle}
                    message={state.message}
                    className="mt-4"
                />
            )}
        </div>
    );
}