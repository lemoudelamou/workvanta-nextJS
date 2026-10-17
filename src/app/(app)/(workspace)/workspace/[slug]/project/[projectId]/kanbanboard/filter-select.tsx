import { ChevronDown } from "lucide-react";

export function FilterSelect({
                                 value,
                                 onChange,
                                 icon,
                                 children,
                                 ariaLabel,
                             }: {
    ariaLabel?: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center">
                {icon}
            </div>

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-label={ariaLabel}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-card pl-9 pr-9 text-sm font-medium text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            >
                {children}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
}