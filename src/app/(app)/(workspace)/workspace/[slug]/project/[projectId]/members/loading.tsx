import { PageBody } from "@/components/ui/PageBody";

function Bar({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
        />
    );
}

export default function ProjectMembersLoading() {
    return (
        <PageBody>
            <div role="status" aria-label="Loading project members">
                <Bar className="mb-6 h-4 w-56" />

                {/* Header */}
                <div className="space-y-3">
                    <Bar className="h-3 w-28" />
                    <Bar className="h-8 w-56" />
                    <Bar className="h-4 w-96 max-w-full" />
                </div>

                {/* KPI strip */}
                <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
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

                {/* Add member */}
                <div className="mt-10 rounded-xl border border-border bg-card p-6">
                    <div className="flex items-start gap-3">
                        <Bar className="size-9 rounded-xl" />
                        <div className="space-y-2">
                            <Bar className="h-5 w-36" />
                            <Bar className="h-3 w-72 max-w-full" />
                        </div>
                    </div>
                    <Bar className="mt-5 h-10 w-full rounded-xl" />
                </div>

                {/* Members */}
                <div className="mt-10">
                    <Bar className="h-5 w-28" />
                    <Bar className="mt-2 h-3 w-52" />
                    <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                <Bar className="size-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Bar className="h-4 w-40" />
                                    <Bar className="h-3 w-56 max-w-full" />
                                </div>
                                <Bar className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading…</span>
            </div>
        </PageBody>
    );
}