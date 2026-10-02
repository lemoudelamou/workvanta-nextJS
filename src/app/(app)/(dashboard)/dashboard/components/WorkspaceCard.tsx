import { FolderKanban, UsersRound } from "lucide-react";
import { plural } from "./helpers";
import { accentFor } from "@/lib/accent";
import { CardLink } from "@/components/ui/CardLink";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { timeAgo } from "./helpers";
import type { Membership } from "@/app/(app)/(dashboard)/dashboard/components/types";
import { initials } from "./helpers";


export function WorkspaceCard({
    membership,
    accessibleCount,
}: {
    membership: Membership;
    accessibleCount: number;
}) {
    const { role, workspace } = membership;

    return (
        <CardLink
            href={`/workspace/${workspace.slug}`}
            interactive
            accent={accentFor(workspace.slug)}
            className="block border border-border bg-card p-4 shadow-none"
        >
            <div className="flex items-center gap-3">
                <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-sm font-semibold text-[rgb(var(--accent))]"
                >
                    {initials(workspace.name)}
                </span>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-[rgb(var(--accent))]">
                        {workspace.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Active {timeAgo(workspace.updatedAt)}
                    </p>
                </div>

                <RoleBadge role={role} className="px-2 py-0.5 text-[10px]" />
            </div>

            <dl className="mt-4 flex items-center gap-5 border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <FolderKanban className="size-3.5" aria-hidden="true" />
                    <dt className="sr-only">Projects</dt>
                    <dd>{plural(accessibleCount, "project")}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                    <UsersRound className="size-3.5" aria-hidden="true" />
                    <dt className="sr-only">Members</dt>
                    <dd>{plural(workspace._count.members, "member")}</dd>
                </div>
            </dl>
        </CardLink>
    );
}