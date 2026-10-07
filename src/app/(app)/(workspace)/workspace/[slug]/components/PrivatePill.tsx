import { Lock } from "lucide-react"

export function PrivatePill() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Private
        </span>
    );
}