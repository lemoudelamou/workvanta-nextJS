import { PageBody } from "@/components/ui/PageBody";

function Bar({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
        />
    );
}

export default function WorkspaceLoading() {
    return (
        <PageBody>
            <div role="status" aria-label="Loading workspaces">
                {/* Header */}
                <div className="flex items-end justify-between gap-6">
                    <div className="space-y-3">
                        <Bar className="h-3 w-24" />
                        <Bar className="h-8 w-60" />
                        <Bar className="h-4 w-96 max-w-full" />
                    </div>
                    <Bar className="hidden h-10 w-44 rounded-xl sm:block" />
                </div>

                {/* KPI strip */}
                <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-card p-6">
                            <div className="flex items-center gap-3">
                                <Bar className="size-9 rounded-xl" />
                                <Bar className="h-4 w-28" />
                            </div>
                            <Bar className="mt-5 h-9 w-16" />
                            <Bar className="mt-2 h-3 w-40" />
                        </div>
                    ))}
                </div>

                <div className="mt-12">
                    <Bar className="h-5 w-40" />
                    <Bar className="mt-2 h-3 w-64" />
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-border bg-card p-5"
                            >
                                <div className="flex items-start justify-between">
                                    <Bar className="size-11 rounded-xl" />
                                    <Bar className="h-5 w-16 rounded-full" />
                                </div>
                                <Bar className="mt-5 h-5 w-40" />
                                <Bar className="mt-3 h-3 w-full" />
                                <Bar className="mt-2 h-3 w-2/3" />
                                <div className="mt-5 flex gap-4 border-t border-border pt-4">
                                    <Bar className="h-3 w-20" />
                                    <Bar className="h-3 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading…</span>
            </div>
        </PageBody>
    );
}