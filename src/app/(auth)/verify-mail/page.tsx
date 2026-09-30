
import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";

import WorkvantaBrand from "@/components/ui/WorkvantaBrand";
import {
    authButton,
    ghostButton,
    glass,
    hairline,
    primaryButton,
    starlightEdge,
} from "@/app/style/ui-tokens";

export default function VerifyEmailPage() {
    return (
        <VerificationResult
            success
            title="Email verified"
            message="Your email address user@example.com has been successfully verified."
        />
    );
}

function VerificationResult({
    success,
    title,
    message,
}: {
    success: boolean;
    title: string;
    message: string;
}) {
    const continueLink = (
        <Link
            key="continue"
            href="/dashboard"
            className={`${authButton} ${success ? primaryButton : ghostButton}`}
        >
            Continue to Workvanta
            <ArrowRight
                className={`size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 ${success
                    ? "opacity-60"
                    : "text-slate-400 dark:text-slate-500"
                    }`}
            />
        </Link>
    );

    const settingsLink = (
        <Link
            key="settings"
            href="/settings"
            className={`${authButton} ${success ? ghostButton : primaryButton}`}
        >
            Open settings
        </Link>
    );

    return (
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 dark:bg-slate-950 dark:text-white">

            <div className="relative w-full max-w-md">
                <section
                    className={`${glass} ${hairline} ${starlightEdge} relative overflow-hidden rounded-[28px] px-6 pb-8 pt-12 text-center sm:px-10 sm:pb-10`}
                >
                    <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-slate-200/40 blur-3xl dark:bg-blue-500/[0.05]" />

                    <div className="relative">
                        <div className="pt-2">
                            < WorkvantaBrand />
                        </div>

                        <div
                            aria-hidden="true"
                            className={`mx-auto mt-14 flex size-11 items-center justify-center rounded-xl border ${success
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08] dark:text-emerald-300"
                                : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/[0.08] dark:text-red-300"
                                }`}
                        >
                            {success ? (
                                <CheckCircle2 className="size-5" />
                            ) : (
                                <AlertTriangle className="size-5" />
                            )}
                        </div>

                        <div role={success ? "status" : "alert"}>
                            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl dark:text-white">
                                {title}
                            </h1>

                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {message}
                            </p>
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            {success
                                ? [continueLink, settingsLink]
                                : [settingsLink, continueLink]}
                        </div>
                    </div>
                </section>

                <p className="relative mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Work smarter, together.
                </p>
            </div>
        </main>
    );
}
