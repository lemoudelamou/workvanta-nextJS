import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";

import { initials, plural, timeAgo } from "@/app/(app)/(workspace)/workspace/components/helpers";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { projectHex } from "@/lib/navigation/project-color";
import type { WorkspaceItem } from "@/app/(app)/(workspace)/workspace/components/types";

/** The workspace's badge: its initials on its own colour. */
export function WorkspaceBadge({ id, name, size = "md" }: { id: string; name: string; size?: "md" | "lg" }) {
    return (
        <span
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center font-semibold text-white shadow-[0_6px_16px_-8px_rgba(23,26,33,0.45)] ${
                size === "lg" ? "size-14 rounded-2xl text-lg" : "size-11 rounded-xl text-sm"
            }`}
            style={{ background: `linear-gradient(135deg, ${projectHex(id)}, ${projectHex(`${id}-2`)})` }}
        >
            {initials(name)}
        </span>
    );
}

export function WorkspaceCard({ item }: { item: WorkspaceItem }) {
    const { role, workspace } = item;
    const people = (workspace.members ?? []).map((m) => m.user);

    return (
        <Link
            href={`/workspace/${workspace.slug}`}
            className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(23,26,33,0.04)] outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_12px_28px_-16px_rgba(23,26,33,0.25)] focus-visible:ring-2 focus-visible:ring-brand motion-reduce:hover:translate-y-0"
        >
            <div className="flex items-start gap-3">
                <WorkspaceBadge id={workspace.id} name={workspace.name} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-brand">
                            {workspace.name}
                        </h3>
                        <RoleBadge role={role} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                        {workspace.description || "A shared home for your team’s work."}
                    </p>
                </div>
                <ArrowRight
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                />
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <FolderKanban className="size-3.5" aria-hidden="true" />
                    {plural(workspace._count.projects, "project")}
                </span>
                <span>Active {timeAgo(workspace.updatedAt)}</span>
                <span className="ml-auto">
                    <AvatarStack
                        people={people}
                        max={4}
                        total={workspace._count.members}
                        label={plural(workspace._count.members, "member")}
                    />
                </span>
            </div>
        </Link>
    );
}
