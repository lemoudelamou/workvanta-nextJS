import { CenteredFormPage } from "@/components/ui/PageBody";

function Bar({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
        />
    );
}

export default function CreateNewLoading() {
    return (
        <CenteredFormPage>
            <div role="status" aria-label="Loading form">
                <Bar className="size-11 rounded-xl" />

                <Bar className="mt-6 h-3.5 w-20" />
                <Bar className="mt-3 h-7 w-64 max-w-full" />
                <Bar className="mt-3 h-3.5 w-full" />
                <Bar className="mt-2 h-3.5 w-3/4" />

                <div className="mt-7 space-y-5">
                    <div>
                        <Bar className="h-3.5 w-32" />
                        <Bar className="mt-2 h-11 w-full rounded-xl" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <Bar className="h-3.5 w-48" />
                            <Bar className="h-3 w-14" />
                        </div>
                        <Bar className="mt-2 h-24 w-full rounded-xl" />
                    </div>

                    <Bar className="h-12 w-full rounded-xl" />
                </div>

                <div className="mt-6 flex gap-2 rounded-xl bg-muted/50 p-3">
                    <Bar className="mt-0.5 size-3.5 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Bar className="h-3 w-full" />
                        <Bar className="h-3 w-2/3" />
                    </div>
                </div>

                <span className="sr-only">Loading…</span>
            </div>
        </CenteredFormPage>
    );
}