import { ChevronDown } from "lucide-react";

export function FilterSelect({
                                 value,
                                 onChange,
                                 icon,
                                 children,
                             }: {
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
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:focus:bg-white/[0.06]"
            >
                {children}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
    );
}