import Link from "next/link";
import { Plus } from "lucide-react";

export function NewWorkspaceTile() {
    return (
        <Link
            href="/workspace/new"
            className="
                group flex min-h-[220px] h-full flex-col items-center justify-center gap-3
                rounded-2xl border border-dashed border-border bg-transparent p-5
                text-center outline-none transition-colors
                hover:border-foreground/30 hover:bg-muted/50
                focus-visible:ring-2 focus-visible:ring-ring
                focus-visible:ring-offset-2 focus-visible:ring-offset-background
            "
        >
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                <Plus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">
                New workspace
            </span>
            <span className="max-w-[16rem] text-xs text-muted-foreground">
                Give another team its own space for projects and people.
            </span>
        </Link>
    );
}