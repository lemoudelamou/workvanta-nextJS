import Link from "next/link";
import { Plus } from "lucide-react";

export function NewProjectTile({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="group flex h-full min-h-[118px] items-center justify-center gap-3 rounded-xl border border-dashed border-foreground/20 p-4 text-left outline-none transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-brand/10"
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand group-hover:text-white dark:group-hover:text-[#0f1115]">
                <Plus className="size-4" aria-hidden="true" />
            </span>
            <span>
                <span className="block text-sm font-semibold text-foreground">New project</span>
                <span className="block text-xs text-muted-foreground">Plan and track a new piece of work</span>
            </span>
        </Link>
    );
}
