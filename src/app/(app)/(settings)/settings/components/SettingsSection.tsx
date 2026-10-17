import type { ReactNode } from "react";

/** One settings section: an anchor for the side menu, a title, cards. */
export function SettingsSection({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 lg:scroll-mt-8">
            <h2 id={`${id}-title`} className="text-lg font-semibold tracking-[-0.01em] text-foreground">
                {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-4 space-y-4">{children}</div>
        </section>
    );
}

/** A card inside a section, optionally with its own small heading. */
export function SettingsCard({
    title,
    description,
    tone = "default",
    children,
}: {
    title?: string;
    description?: string;
    tone?: "default" | "danger";
    children: ReactNode;
}) {
    return (
        <div
            className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)] ${
                tone === "danger" ? "border-danger/30" : "border-border"
            }`}
        >
            {title && (
                <div className="border-b border-border px-5 py-4 sm:px-6">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
}
