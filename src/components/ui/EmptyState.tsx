export function EmptyState({ icon, title, description, action, className }: {
    icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; className?: string;
}) {
    return (
        <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className ?? ""}`}>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 [&>svg]:size-6">
                {icon}
            </div>
            <h3 className="mt-5 text-base font-semibold">{title}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}