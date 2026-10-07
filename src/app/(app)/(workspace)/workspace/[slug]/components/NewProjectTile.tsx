import Link from "next/link";
import {Plus} from "lucide-react";

export function NewProjectTile({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="
                group flex h-full min-h-[200px] flex-col items-center justify-center gap-3
                rounded-2xl border border-dashed border-border p-5 text-center
                outline-none transition-colors
                hover:border-foreground/30 hover:bg-muted/50
                focus-visible:ring-2 focus-visible:ring-ring
                focus-visible:ring-offset-2 focus-visible:ring-offset-background
            "
        >
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                <Plus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">
                New project
            </span>
            <span className="max-w-[16rem] text-xs text-muted-foreground">
                Start a project to plan and track a piece of work.
            </span>
        </Link>
    );
}