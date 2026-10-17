import { labelColor } from "@/lib/labels/label-colors";

/** A small coloured tag. */
export function LabelChip({ name, color, size = "sm" }: { name: string; color: string; size?: "xs" | "sm" }) {
    const c = labelColor(color);
    return (
        <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${c.chip} ${
                size === "xs" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs"
            }`}
        >
            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
            <span className="truncate">{name}</span>
        </span>
    );
}

/** Up to `max` chips, then "+N" for the rest. */
export function LabelChips({
    labels,
    max = 3,
    size = "xs",
}: {
    labels: { id: string; name: string; color: string }[];
    max?: number;
    size?: "xs" | "sm";
}) {
    if (labels.length === 0) return null;
    const shown = labels.slice(0, max);
    const extra = labels.length - shown.length;
    return (
        <span className="flex min-w-0 flex-wrap items-center gap-1" aria-label={`Labels: ${labels.map((l) => l.name).join(", ")}`}>
            {shown.map((l) => (
                <LabelChip key={l.id} name={l.name} color={l.color} size={size} />
            ))}
            {extra > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground" title={labels.slice(max).map((l) => l.name).join(", ")}>
                    +{extra}
                </span>
            )}
        </span>
    );
}
