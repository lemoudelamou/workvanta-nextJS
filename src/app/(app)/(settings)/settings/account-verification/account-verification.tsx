"use client";

import { useActionState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Mail,
    RefreshCw,
} from "lucide-react";

import {
    resendEmailVerification,
    type EmailVerificationState,
} from "@/app/(app)/(settings)/settings/account-verification/actions";
import { buttonStyles } from "@/app/style/button-style";

const initialVerificationState: EmailVerificationState = {
    success: false,
    message: "",
};

type AccountVerificationProps = {
    email: string;
    verified: boolean;
};

export default function AccountVerification({
    email,
    verified,
}: AccountVerificationProps) {
    const [
        verificationState,
        resendVerification,
        isResendingVerification,
    ] = useActionState(
        resendEmailVerification,
        initialVerificationState,
    );

    if (verified) {
        return (
            <div className="p-5 sm:p-7">
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]">
                    <div className="flex items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/[0.1] dark:text-emerald-300">
                            <CheckCircle2
                                className="size-5"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="min-w-0">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08] dark:text-emerald-300">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Verified
                            </span>

                            <p className="mt-1 text-sm leading-6 text-emerald-800/70 dark:text-emerald-200/70">
                                Your email address{" "}
                                <span className="font-medium">
                                    {email}
                                </span>{" "}
                                has been verified.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-amber-500/[0.06] px-5 py-3.5 sm:px-6 dark:bg-amber-400/[0.05]">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                    <p className="text-sm text-foreground">
                        <span className="font-medium">Confirm your email address.</span>{" "}
                        <span className="text-muted-foreground">
                            We sent a link to <span className="break-all">{email}</span>.
                        </span>
                    </p>
                </div>

                <form action={resendVerification} className="shrink-0 pl-7 sm:pl-0">
                    <button
                        type="submit"
                        disabled={isResendingVerification}
                        className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                        <RefreshCw
                            className={`size-3.5 ${isResendingVerification ? "animate-spin" : ""}`}
                            aria-hidden="true"
                        />
                        {isResendingVerification ? "Sending…" : "Resend link"}
                    </button>
                </form>
            </div>

            {verificationState.message && (
                <div
                    role={
                        verificationState.success
                            ? "status"
                            : "alert"
                    }
                    className="mt-2 flex items-start gap-2 pl-7"
                >
                    {verificationState.success ? (
                        <CheckCircle2
                            className="mt-0.5 size-4 shrink-0 text-status-done"
                            aria-hidden="true"
                        />
                    ) : (
                        <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-danger"
                            aria-hidden="true"
                        />
                    )}

                    <p
                        className={`text-sm leading-6 ${
                            verificationState.success
                                ? "text-status-done"
                                : "text-danger"
                        }`}
                    >
                        {verificationState.message}
                    </p>
                </div>
            )}
        </div>
    );
}

