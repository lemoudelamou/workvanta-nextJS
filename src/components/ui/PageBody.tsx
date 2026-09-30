import { cn } from "@/lib/utils";

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <main className="min-h-screen bg-[#f8f8fa] text-slate-950 dark:bg-slate-950 dark:text-white">
            <div className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10", className)}>
                {children}
            </div>
        </main>
    );
}

export function CenteredFormPage({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[#f8f8fa] dark:bg-slate-950">
            <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl items-center px-4 py-12 sm:px-6">
                <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900 sm:p-9">
                    {children}
                </div>
            </section>
        </main>
    );
}