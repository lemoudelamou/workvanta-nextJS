import { cn } from "@/lib/utils";

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <main className="text-foreground">
            <div className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10", className)}>
                {children}
            </div>
        </main>
    );
}

export function CenteredFormPage({ children }: { children: React.ReactNode }) {
    return (
        <main>
            <section className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-xl items-center px-4 py-12 sm:px-6">
                <div className="w-full rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(23,26,33,0.04)] sm:p-9">
                    {children}
                </div>
            </section>
        </main>
    );
}