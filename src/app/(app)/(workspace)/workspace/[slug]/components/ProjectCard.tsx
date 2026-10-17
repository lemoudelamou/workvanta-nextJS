import Link from "next/link";
import {PrivatePill} from "@/app/(app)/(workspace)/workspace/[slug]/components/PrivatePill";
import {UpdatedAt} from "@/app/(app)/(workspace)/workspace/[slug]/components/UpdatedAt";
import {Card} from "@/components/ui/Card";
import {accentFor} from "@/app/(app)/(workspace)/workspace/components/helpers";
import {Lock} from "lucide-react";
import { ProjectMark } from "@/components/ui/ProjectMark";
import { ProjectItem} from "@/types/project-item";
import { personColor } from "@/lib/ui/person-color";

const SEGMENTS = [
    ["DONE", "bg-status-done"],
    ["IN_REVIEW", "bg-status-review"],
    ["IN_PROGRESS", "bg-status-progress"],
    ["TODO", "bg-status-todo/45"],
] as const;

function initialsOf(name: string | null, email: string) {
    const source = name?.trim() || email;
    const parts = source.split(/\s+/).filter(Boolean);
    return ((parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)) || "?").toUpperCase();
}

/** Done-first segmented bar, "x of y done", and who's working on it. */
function ProjectProgress({
    counts,
    people,
}: {
    counts: NonNullable<ProjectItem["counts"]>;
    people: NonNullable<ProjectItem["people"]>;
}) {
    const total = counts.TODO + counts.IN_PROGRESS + counts.IN_REVIEW + counts.DONE;

    return (
        <div className="mt-4">
            <div
                role="img"
                aria-label={total ? `${counts.DONE} of ${total} tasks done` : "No tasks yet"}
                className="flex h-1.5 origin-left gap-px overflow-hidden rounded-full bg-muted motion-safe:animate-[bar-grow_700ms_cubic-bezier(.2,.8,.2,1)_both]"
            >
                {total > 0 &&
                    SEGMENTS.map(([status, color]) =>
                        counts[status] > 0 ? (
                            <span key={status} className={color} style={{ flexGrow: counts[status] }} />
                        ) : null,
                    )}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                    {total ? (
                        <>
                            <span className="font-medium text-foreground">{counts.DONE}</span> of {total} done
                        </>
                    ) : (
                        "No tasks yet"
                    )}
                </span>
                {people.length > 0 && (
                    <span className="flex -space-x-1.5" aria-label={`Assigned: ${people.map((p) => p.name ?? p.email).join(", ")}`}>
                        {people.map((person) => (
                            <span
                                key={person.id}
                                title={person.name ?? person.email}
                                className={`flex size-6 items-center justify-center overflow-hidden rounded-full text-[9px] font-semibold ring-2 ring-card ${personColor(person.email)}`}
                            >
                                {person.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={person.image} alt="" className="size-full object-cover" />
                                ) : (
                                    initialsOf(person.name, person.email)
                                )}
                            </span>
                        ))}
                    </span>
                )}
            </div>
        </div>
    );
}


export function ProjectCard({
                                project,
                                workspaceSlug,
                            }: {
    project: ProjectItem;
    workspaceSlug: string;
}) {
    if (!project.accessible) {
        return (
            <div
                aria-disabled="true"
                title="This project is private and you haven't been added to it."
                className="flex h-full cursor-not-allowed flex-col rounded-xl border border-dashed border-border bg-muted/30 p-5"
            >
                <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Lock className="size-5" aria-hidden="true" />
                    </span>
                    <PrivatePill />
                </div>

                <h3 className="mt-5 truncate font-semibold text-muted-foreground">
                    {project.name}
                </h3>
                <p className="mt-1.5 min-h-10 text-sm leading-5 text-muted-foreground">
                    You don&apos;t have access. Ask a project member to add you.
                </p>

                <div className="mt-auto pt-5">
                    <UpdatedAt date={project.updatedAt} />
                </div>
            </div>
        );
    }

    return (
        <Link
            href={`/workspace/${workspaceSlug}/project/${project.id}`}
            // The card body is an <article>, which browsers don't use for the
            // link's accessible name, so name the link explicitly.
            aria-label={`Open project ${project.name}`}
            className="
                group block h-full rounded-xl outline-none
                focus-visible:ring-2 focus-visible:ring-ring
                focus-visible:ring-offset-2
                focus-visible:ring-offset-background
            "
        >
            <Card
                as="article"
                interactive
                accent={accentFor(project.id)}
                className="flex h-full flex-col border border-border bg-card p-5 shadow-sm"
            >
                <div className="flex items-center justify-between">
                    <ProjectMark projectId={project.id} size="lg" />

                    {project.visibility === "PRIVATE" && <PrivatePill />}
                </div>

                <h3 className="mt-5 truncate font-semibold text-foreground transition-colors group-hover:text-brand">
                    {project.name}
                </h3>

                <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                    {project.description || "No description yet."}
                </p>

                {project.counts && <ProjectProgress counts={project.counts} people={project.people ?? []} />}

                <div className="mt-auto pt-5">
                    <div className="border-t border-border pt-4">
                        <UpdatedAt date={project.updatedAt} />
                    </div>
                </div>
            </Card>
        </Link>
    );
}