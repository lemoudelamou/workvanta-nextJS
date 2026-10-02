import { PageBody } from "@/components/ui/PageBody";

function Bar({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
        />
    );
}

export default function DashboardLoading() {
    return (
        <PageBody>
            <div role="status" aria-label="Loading dashboard">
                {/* Header */}
                <div className="flex items-end justify-between gap-6">
                    <div className="space-y-3">
                        <Bar className="h-3 w-20" />
                        <Bar className="h-8 w-72" />
                        <Bar className="h-4 w-96 max-w-full" />
                    </div>
                    <Bar className="hidden h-10 w-56 rounded-xl sm:block" />
                </div>
                <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
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

                <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <div>
                        <Bar className="h-5 w-40" />
                        <Bar className="mt-2 h-3 w-64" />
                        <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card p-1.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-3 py-3.5">
                                    <Bar className="size-10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Bar className="h-4 w-48 max-w-full" />
                                        <Bar className="h-3 w-72 max-w-full" />
                                    </div>
                                    <Bar className="hidden h-3 w-20 sm:block" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Bar className="h-5 w-36" />
                        <Bar className="mt-2 h-3 w-40" />
                        <div className="mt-5 space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border border-border bg-card p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <Bar className="size-10 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <Bar className="h-4 w-32" />
                                            <Bar className="h-3 w-20" />
                                        </div>
                                    </div>
                                    <Bar className="mt-4 h-3 w-40" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <span className="sr-only">Loading…</span>
            </div>
        </PageBody>
    );
}