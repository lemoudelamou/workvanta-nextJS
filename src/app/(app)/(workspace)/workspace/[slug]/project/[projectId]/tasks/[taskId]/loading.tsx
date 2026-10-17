import { PageBody } from "@/components/ui/PageBody";

function Bar({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
        />
    );
}

function PanelSkeleton({ rows = 2 }: { rows?: number }) {
    return (
        <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
                <Bar className="size-9 rounded-xl" />
                <div className="space-y-2">
                    <Bar className="h-4 w-32" />
                    <Bar className="h-3 w-48" />
                </div>
            </div>
            <div className="mt-5 space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <Bar key={i} className="h-12 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}

export default function TaskLoading() {
    return (
        <PageBody>
            <div role="status" aria-label="Loading task">
                <Bar className="mb-6 h-4 w-64" />

                {/* Header */}
                <div className="flex gap-2">
                    <Bar className="h-6 w-24 rounded-full" />
                    <Bar className="h-6 w-28 rounded-full" />
                </div>
                <Bar className="mt-4 h-9 w-2/3 max-w-xl" />
                <Bar className="mt-3 h-4 w-full max-w-2xl" />
                <Bar className="mt-2 h-4 w-1/2 max-w-xl" />

                {/* Meta strip */}
                <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-card p-5">
                            <Bar className="h-3 w-16" />
                            <Bar className="mt-3 h-5 w-32" />
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <PanelSkeleton rows={3} />
                        <PanelSkeleton rows={1} />
                        <PanelSkeleton rows={2} />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6">
                        <div className="flex items-start gap-3">
                            <Bar className="size-9 rounded-xl" />
                            <div className="space-y-2">
                                <Bar className="h-4 w-24" />
                                <Bar className="h-3 w-40" />
                            </div>
                        </div>
                        <div className="mt-6 space-y-5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Bar className="h-3 w-16" />
                                    <Bar className="h-10 w-full rounded-xl" />
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