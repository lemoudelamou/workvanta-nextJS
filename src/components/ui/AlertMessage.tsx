"use client";

import { useEffect, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertMessageProps {
    variant?: AlertVariant;
    title: string;
    message?: string;
    className?: string;
    duration?: number;
}

const variantConfig: Record<
    AlertVariant,
    {
        icon: LucideIcon;
        container: string;
        iconColor: string;
    }
> = {
    success: {
        icon: CheckCircle2,
        container:
            "border-emerald-500/30 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/10",
        iconColor:
            "text-emerald-600 dark:text-emerald-400",
    },
    error: {
        icon: AlertTriangle,
        container:
            "border-rose-500/30 bg-rose-50 dark:border-rose-400/30 dark:bg-rose-500/10",
        iconColor:
            "text-rose-600 dark:text-rose-400",
    },
    warning: {
        icon: AlertTriangle,
        container:
            "border-amber-500/30 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10",
        iconColor:
            "text-amber-600 dark:text-amber-400",
    },
    info: {
        icon: Info,
        container:
            "border-sky-500/30 bg-sky-50 dark:border-sky-400/30 dark:bg-sky-500/10",
        iconColor:
            "text-sky-600 dark:text-sky-400",
    },
};

export function AlertMessage({
    variant = "info",
    title,
    message,
    className = "",
    duration = 5000,
}: AlertMessageProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (duration <= 0) {
            return;
        }

        const timer = window.setTimeout(() => {
            setVisible(false);
        }, duration);

        return () => {
            window.clearTimeout(timer);
        };
    }, [duration]);

    if (!visible) {
        return null;
    }

    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <div
            role={variant === "error" ? "alert" : "status"}
            className={`flex gap-3 rounded-xl border px-4 py-3 ${config.container} ${className}`}
        >
            <Icon
                className={`mt-0.5 size-4 shrink-0 ${config.iconColor}`}
                strokeWidth={2}
                aria-hidden="true"
            />

            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {title}
                </p>

                {message && (
                    <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-300">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}

