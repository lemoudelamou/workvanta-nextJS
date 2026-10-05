

import { WorkspaceItem } from "@/app/(app)/(workspace)/workspace/components/types"
import { WorkspaceCard } from "@/app/(app)/(workspace)/workspace/components/WorkspaceCard"

export function WorkspaceSection({
    id,
    title,
    description,
    items,
    empty,
    trailing,
    className = "",
}: {
    id: string;
    title: string;
    description: string;
    items: WorkspaceItem[];
    empty: React.ReactNode;
    trailing?: React.ReactNode;
    className?: string;
}) {
    return (
        <section aria-labelledby={id} className={className}>
            <div className="mb-5 flex items-center gap-2.5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2
                            id={id}
                            className="text-lg font-semibold tracking-tight text-foreground"
                        >
                            {title}
                        </h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                            {items.length}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>

            {items.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                        <WorkspaceCard key={item.workspace.slug} item={item} />
                    ))}
                    {trailing}
                </div>
            ) : (
                empty
            )}
        </section>
    );
}
