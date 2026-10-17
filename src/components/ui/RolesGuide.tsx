export type RoleGuideEntry = {
    role: string;
    label: string;
    description: string;
    dot: string;
    /** How many people have it (omit to hide). */
    count?: number;
    /** Marks the viewer's own role. */
    current?: boolean;
};

/** A short side card explaining roles, with the viewer's own one marked. */
export function RolesGuide({ title, roles, footer }: { title: string; roles: RoleGuideEntry[]; footer?: React.ReactNode }) {
    return (
        <aside
            aria-label={title}
            className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(23,26,33,0.04)] xl:sticky xl:top-6"
        >
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <ul className="mt-3 space-y-1">
                {roles.map((entry) => (
                    <li
                        key={entry.role}
                        className={`rounded-xl px-3 py-2.5 ${entry.current ? "bg-brand-soft/60 ring-1 ring-inset ring-brand/20 dark:bg-brand/10" : ""}`}
                    >
                        <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                            <span aria-hidden="true" className={`size-2 rounded-full ${entry.dot}`} />
                            {entry.label}
                            {entry.current && <span className="text-xs font-normal text-brand">Your role</span>}
                            {entry.count !== undefined && (
                                <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">{entry.count}</span>
                            )}
                        </p>
                        <p className="mt-0.5 pl-4 text-xs leading-5 text-muted-foreground">{entry.description}</p>
                    </li>
                ))}
            </ul>
            {footer && <div className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{footer}</div>}
        </aside>
    );
}
