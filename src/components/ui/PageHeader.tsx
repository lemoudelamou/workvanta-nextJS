export function PageHeader({
    title, description, actions, icon,
}: {
    /** Shown before the title, e.g. a project's color mark. */
    icon?: React.ReactNode;
    /** Kept for compatibility; no longer shown (breadcrumbs carry context). */
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
                {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
                <div className="min-w-0">
                <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-[2rem]">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                )}
                </div>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </section>
    );
}
