import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";

import { AvatarStack } from "@/components/ui/AvatarStack";
import { projectDot, projectHex } from "@/lib/navigation/project-color";
import type { ProjectItem } from "@/types/project-item";

const SEGMENTS = [
    ["DONE", "bg-status-done"],
    ["IN_REVIEW", "bg-status-review"],
    ["IN_PROGRESS", "bg-status-progress"],
    ["TODO", "bg-status-todo/45"],
] as const;

export function projectTotals(project: ProjectItem) {
    const counts = project.counts ?? { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    const total = counts.TODO + counts.IN_PROGRESS + counts.IN_REVIEW + counts.DONE;
    return { counts, total, open: total - counts.DONE, percent: total ? Math.round((counts.DONE / total) * 100) : 0 };
}

/** A project at a glance: progress, what's open or late, and who's on it. */
export function ProjectCard({ project, workspaceSlug }: { project: ProjectItem; workspaceSlug: string }) {
    const { counts, total, open, percent } = projectTotals(project);
    const overdue = project.overdue ?? 0;

    return (
        <Link
            href={`/workspace/${workspaceSlug}/project/${project.id}`}
            aria-label={`Open project ${project.name}`}
            className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(23,26,33,0.04)] outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_12px_28px_-16px_rgba(23,26,33,0.25)] focus-visible:ring-2 focus-visible:ring-brand motion-reduce:hover:translate-y-0"
        >
            {/* The project's colour along the top edge. */}
            <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] opacity-80"
                style={{ background: projectHex(project.id) }}
            />

            <div className="flex items-start gap-2.5">
                <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-[3px] ${projectDot(project.id)}`} />
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span className="truncate transition-colors group-hover:text-brand">{project.name}</span>
                        {project.visibility === "PRIVATE" && (
                            <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Private" />
                        )}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                        {project.description || "No description yet."}
                    </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{percent}%</span>
            </div>

            <div
                role="img"
                aria-label={total ? `${counts.DONE} of ${total} tasks done` : "No tasks yet"}
                className="mt-4 flex h-1.5 gap-px overflow-hidden rounded-full bg-muted"
            >
                {total > 0 &&
                    SEGMENTS.map(([status, color]) =>
                        counts[status] > 0 ? (
                            <span key={status} className={color} style={{ flexGrow: counts[status] }} />
                        ) : null,
                    )}
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                {total === 0 ? (
                    <span>No tasks yet</span>
                ) : (
                    <span className="tabular-nums">
                        <span className="font-medium text-foreground">{open}</span> open
                    </span>
                )}
                {overdue > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                        <AlertCircle className="size-3.5" aria-hidden="true" />
                        {overdue} overdue
                    </span>
                )}
                <span className="ml-auto flex items-center gap-2.5">
                    {project.updatedLabel && <span className="hidden sm:inline">{project.updatedLabel}</span>}
                    <AvatarStack people={project.people ?? []} max={3} />
                </span>
            </div>
        </Link>
    );
}
