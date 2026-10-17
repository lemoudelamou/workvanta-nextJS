"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";

import type { ProjectItem } from "@/types/project-item";
import { ProjectCard, projectTotals } from "./ProjectCard";

type Sort = "recent" | "name" | "progress";

/** The workspace's project cards, with a quick filter and sort. */
export function ProjectsBrowser({
    projects,
    workspaceSlug,
    trailing,
}: {
    projects: ProjectItem[];
    workspaceSlug: string;
    /** Shown after the cards, e.g. a "New project" tile. */
    trailing?: ReactNode;
}) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<Sort>("recent");

    const words = query.trim().toLowerCase();
    const shown = projects
        .filter((p) => !words || `${p.name} ${p.description ?? ""}`.toLowerCase().includes(words))
        .sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            if (sort === "progress") return projectTotals(b).percent - projectTotals(a).percent;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    return (
        <div>
            {projects.length > 3 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <label className="relative min-w-0 flex-1 sm:max-w-xs">
                        <span className="sr-only">Find a project</span>
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Find a project"
                            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-4 focus:ring-brand/15"
                        />
                    </label>
                    <label className="ml-auto flex items-center gap-2 text-[13px] text-muted-foreground">
                        Sort by
                        <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value as Sort)}
                            className="h-9 rounded-lg border border-border bg-card px-2.5 text-[13px] font-medium text-foreground outline-none focus:border-brand dark:[color-scheme:dark]"
                        >
                            <option value="recent">Recently updated</option>
                            <option value="name">Name</option>
                            <option value="progress">Progress</option>
                        </select>
                    </label>
                </div>
            )}

            {shown.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No projects match “{query.trim()}”.
                </p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {shown.map((project) => (
                        <li key={project.id}>
                            <ProjectCard project={project} workspaceSlug={workspaceSlug} />
                        </li>
                    ))}
                    {!words && trailing && <li>{trailing}</li>}
                </ul>
            )}
        </div>
    );
}
