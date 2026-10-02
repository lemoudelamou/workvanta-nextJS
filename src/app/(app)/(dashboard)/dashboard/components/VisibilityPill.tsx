import { Lock } from "lucide-react";

export function VisibilityPill({
    visibility,
}: {
    visibility: string;
}) {
    if (visibility !== "PRIVATE") {
        return null;
    }

    return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Lock
                className="size-3"
                aria-hidden="true"
            />
            Private
        </span>
    );
}