import  Link  from "next/link";
import { ArrowRight, FolderKanban, UsersRound } from "lucide-react";
import { accentFor, initials, plural, timeAgo } from "@/app/(app)/(workspace)/workspace/components/helpers";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Card } from "@/components/ui/Card";
import { WorkspaceItem } from "@/app/(app)/(workspace)/workspace/components/types"


export function WorkspaceCard({ item }: { item: WorkspaceItem }) {
    const { role, workspace } = item;

    return (
        <Link
            href={`/workspace/${workspace.slug}`}
            className="
                group block h-full rounded-2xl outline-none
                focus-visible:ring-2 focus-visible:ring-ring
                focus-visible:ring-offset-2
                focus-visible:ring-offset-background
            "
        >
            <Card
                as="div"
                interactive
                accent={accentFor(workspace.slug)}
                className="flex h-full flex-col border border-border bg-card p-5 shadow-sm"
            >
                <div className="flex items-start justify-between gap-4">
                    <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-sm font-semibold text-[rgb(var(--accent))]"
                    >
                        {initials(workspace.name)}
                    </span>

                    <RoleBadge role={role} />
                </div>

                <h3 className="mt-5 truncate text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-[rgb(var(--accent))]">
                    {workspace.name}
                </h3>

                <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                    {workspace.description ||
                        "A shared home for your team’s work."}
                </p>

                <div className="mt-auto pt-5">
                    <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <FolderKanban className="size-3.5" aria-hidden="true" />
                            {plural(workspace._count.projects, "project")}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                            <UsersRound className="size-3.5" aria-hidden="true" />
                            {plural(workspace._count.members, "member")}
                        </span>

                        <ArrowRight
                            aria-hidden="true"
                            className="ml-auto size-4 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent))]"
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Active {timeAgo(workspace.updatedAt)}
                    </p>
                </div>
            </Card>
        </Link>
    );
}