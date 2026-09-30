"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type ActiveSessionsProps = {
    count: number;
    children: React.ReactNode;
};

export default function ActiveSessions({
    count,
    children,
}: ActiveSessionsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const sessionLabel = count === 1 ? "session" : "sessions";

    return (
        <div>
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.03] sm:p-7"
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {count} active {sessionLabel}
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {isOpen
                            ? "Hide devices signed in to your account"
                            : "Show devices signed in to your account"}
                    </p>
                </div>

                <ChevronDown
                    aria-hidden="true"
                    className={`size-5 shrink-0 text-slate-400 transition-transform duration-300 dark:text-slate-500 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-slate-200/70 dark:border-white/[0.06]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

