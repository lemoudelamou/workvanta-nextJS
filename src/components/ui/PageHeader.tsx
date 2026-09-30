export function PageHeader({
    eyebrow, title, description, actions,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {eyebrow && (
                    <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{eyebrow}</p>
                )}
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                {description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </section>
    );
}