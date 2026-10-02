import { ArrowRight, Clock, FolderKanban, Lock } from "lucide-react";
import Link from "next/link";

import { accentFor, accentVars } from "@/lib/accent";

import type { RecentProject } from "@/app/(app)/(dashboard)/dashboard/components/types";
import { VisibilityPill } from "./VisibilityPill";
import { timeAgo } from "./helpers";




export function ProjectRow({ project }: { project: RecentProject }) {
    const updated = (
        <time
            dateTime={project.updatedAt.toISOString()}
            title={project.updatedAt.toLocaleString("en-US")}
            className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
        >
            <Clock className="size-3.5" aria-hidden="true" />
            {timeAgo(project.updatedAt)}
        </time>
    );

    if (project.isLocked) {
        return (
            <div
                aria-disabled="true"
                title="This project is private and you haven't been added to it."
                className="flex cursor-not-allowed items-center gap-4 px-3 py-3.5"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Lock className="size-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-muted-foreground">
                            {project.name}
                        </h3>
                        <VisibilityPill visibility={project.visibility} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                        {project.workspace.name} — ask a project member to add you
                    </p>
                </div>

                {updated}
            </div>
        );
    }

    return (
        <Link
            href={`/workspace/${project.workspace.slug}`}
            style={accentVars(accentFor(project.workspace.slug))}
            className="
                group flex items-center gap-4 rounded-xl px-3 py-3.5
                outline-none transition-colors
                hover:bg-[rgb(var(--accent)/0.07)]
                focus-visible:bg-[rgb(var(--accent)/0.07)]
                focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)]
            "
        >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]">
                <FolderKanban className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-[rgb(var(--accent))]">
                        {project.name}
                    </h3>
                    <VisibilityPill visibility={project.visibility} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">
                        {project.workspace.name}
                    </span>
                    {"  "}
                    {project.description || "No description yet"}
                </p>
            </div>

            {updated}

            <ArrowRight
                className="size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent))]"
                aria-hidden="true"
            />
        </Link>
    );
}