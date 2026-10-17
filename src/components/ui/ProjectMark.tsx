import { projectDot } from "@/lib/navigation/project-color";

/** A project's color square, matching its dot in the sidebar. */
export function ProjectMark({ projectId, size = "md" }: { projectId: string; size?: "md" | "lg" }) {
    const box = size === "lg" ? "size-11" : "size-10";
    return (
        <span
            aria-hidden="true"
            className={`flex ${box} shrink-0 items-center justify-center rounded-lg border border-border bg-card`}
        >
            <span className={`size-3 rounded-[4px] ${projectDot(projectId)}`} />
        </span>
    );
}
