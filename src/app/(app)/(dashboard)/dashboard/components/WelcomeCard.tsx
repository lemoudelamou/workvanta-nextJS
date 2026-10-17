"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, X } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";
import type { FirstStep } from "@/lib/onboarding/first-steps";
import { WELCOME_DISMISSED_COOKIE } from "@/lib/navigation/shell-cookies";

/**
 * A short checklist for new people: what to do first, what's done, and
 * where the guide explains each step. It goes away by itself once every
 * step is done, or for good when closed.
 */
export function WelcomeCard({ steps }: { steps: FirstStep[] }) {
    const [closed, setClosed] = useState(false);
    if (closed) return null;

    const done = steps.filter((step) => step.done).length;
    const next = steps.find((step) => !step.done);

    function close() {
        document.cookie = `${WELCOME_DISMISSED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
        setClosed(true);
    }

    return (
        <section
            aria-labelledby="welcome-title"
            className="relative mt-6 overflow-hidden rounded-2xl border border-brand/20 bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]"
        >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 pb-4 pt-5 sm:px-6">
                <div className="min-w-0">
                    <h2 id="welcome-title" className="text-base font-semibold text-foreground">
                        Get started with Workvanta
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {done} of {steps.length} done. These four steps get your team up and running.
                    </p>
                    <div
                        role="progressbar"
                        aria-label="Getting started progress"
                        aria-valuemin={0}
                        aria-valuemax={steps.length}
                        aria-valuenow={done}
                        className="mt-3 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-muted"
                    >
                        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${(done / steps.length) * 100}%` }} />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={close}
                    aria-label="Close the getting started checklist"
                    title="Close"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>

            <ol className="divide-y divide-border">
                {steps.map((step, index) => {
                    const isNext = step.id === next?.id;
                    return (
                        <li key={step.id} className={`flex items-center gap-4 px-5 py-3.5 sm:px-6 ${isNext ? "bg-brand-soft/40 dark:bg-brand/[0.06]" : ""}`}>
                            <span
                                aria-hidden="true"
                                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                    step.done
                                        ? "bg-status-done text-white"
                                        : isNext
                                          ? "bg-brand text-white dark:text-[#0f1115]"
                                          : "border border-border text-muted-foreground"
                                }`}
                            >
                                {step.done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>
                                    {step.title}
                                    <span className="sr-only">{step.done ? " (done)" : ""}</span>
                                </p>
                                {!step.done && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.text}</p>}
                            </div>

                            {!step.done && (
                                <div className="flex shrink-0 items-center gap-3">
                                    <Link
                                        href={step.guide}
                                        className="hidden text-xs font-medium text-muted-foreground hover:text-brand sm:inline"
                                    >
                                        How?
                                    </Link>
                                    {isNext && (
                                        <Link href={step.href} className={buttonStyles({ variant: "primary", size: "sm" })}>
                                            {step.action}
                                            <ArrowRight className="size-3.5" aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>

            <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-sm sm:px-6">
                <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">New here?</span>
                <Link href="/guide" className="font-medium text-brand hover:underline">
                    Read the step-by-step guide
                </Link>
            </div>
        </section>
    );
}
