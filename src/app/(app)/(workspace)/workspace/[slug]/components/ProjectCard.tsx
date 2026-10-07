import Link from "next/link";
import {PrivatePill} from "@/app/(app)/(workspace)/workspace/[slug]/components/PrivatePill";
import {UpdatedAt} from "@/app/(app)/(workspace)/workspace/[slug]/components/UpdatedAt";
import {Card} from "@/components/ui/Card";
import {accentFor} from "@/app/(app)/(workspace)/workspace/components/helpers";
import {FolderKanban, Lock} from "lucide-react";
import { ProjectItem} from "@/types/project-item";


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
                className="flex h-full cursor-not-allowed flex-col rounded-2xl border border-dashed border-border bg-muted/30 p-5"
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
            href={`/workspace/${workspaceSlug}/projects/${project.id}`}
            className="
                group block h-full rounded-2xl outline-none
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
                    <span
                        aria-hidden="true"
                        className="flex size-11 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"
                    >
                        <FolderKanban className="size-5" />
                    </span>

                    {project.visibility === "PRIVATE" && <PrivatePill />}
                </div>

                <h3 className="mt-5 truncate font-semibold text-foreground transition-colors group-hover:text-[rgb(var(--accent))]">
                    {project.name}
                </h3>

                <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                    {project.description || "No description yet."}
                </p>

                <div className="mt-auto pt-5">
                    <div className="border-t border-border pt-4">
                        <UpdatedAt date={project.updatedAt} />
                    </div>
                </div>
            </Card>
        </Link>
    );
}