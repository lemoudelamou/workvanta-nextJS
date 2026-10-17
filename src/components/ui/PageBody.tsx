import { cn } from "@/lib/utils";

export function PageBody({
    children,
    className,
    glow,
}: {
    children: React.ReactNode;
    className?: string;
    /** A color (hex) that softly washes the top of the page, e.g. a project's. */
    glow?: string;
}) {
    return (
        <main className="relative isolate text-foreground">
            {glow && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden lg:rounded-t-xl"
                >
                    <div
                        className="absolute inset-0 opacity-[0.16] dark:opacity-[0.22]"
                        style={{
                            background: `radial-gradient(70% 90% at 12% 0%, ${glow}, transparent 70%), radial-gradient(40% 70% at 85% 0%, ${glow}, transparent 75%)`,
                        }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-canvas" />
                </div>
            )}
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