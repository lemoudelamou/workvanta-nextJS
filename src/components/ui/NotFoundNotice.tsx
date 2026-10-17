import type { ReactNode } from "react";
import Link from "next/link";

import { buttonStyles } from "@/app/style/button-style";

export type NotFoundAction = {
    href: string;
    label: string;
    icon?: ReactNode;
};

/**
 * Shared body for the app's not-found pages: what's missing, the likely
 * reason, and where to go next. The first action is the primary one.
 */
export function NotFoundNotice({
    icon,
    title,
    message,
    actions,
}: {
    icon: ReactNode;
    title: string;
    message: ReactNode;
    actions: NotFoundAction[];
}) {
    return (
        <section className="mx-auto mt-10 flex max-w-lg flex-col items-center px-2 py-12 text-center sm:mt-16">
            <span
                aria-hidden="true"
                className="mb-5 flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
            >
                {icon}
            </span>

            <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground sm:text-2xl">
                {title}
            </h1>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>

            {actions.length > 0 && (
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                    {actions.map((action, index) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className={buttonStyles({ variant: index === 0 ? "primary" : "secondary" })}
                        >
                            {action.icon}
                            {action.label}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
