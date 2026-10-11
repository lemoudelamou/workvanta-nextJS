import { X } from "lucide-react";

export function FilterChip({
                               label,
                               onRemove,
                           }: {
    label: string;
    onRemove: () => void;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            {label}

            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${label} filter`}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
                <X className="size-3" />
            </button>
        </span>
    );
}