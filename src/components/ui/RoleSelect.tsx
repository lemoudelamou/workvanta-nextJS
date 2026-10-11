"use client";

import { useTransition } from "react";

export interface RoleOption<TRole extends string> {
    value: TRole;
    label: string;
    dotColor: string;
}

interface RoleSelectProps<TRole extends string> {
    value: TRole;
    options: RoleOption<TRole>[];
    onChange: (nextRole: TRole) => Promise<void>;
    disabled?: boolean;
    ariaLabel?: string;
}


export function RoleSelect<TRole extends string>({
                                                     value,
                                                     options,
                                                     onChange,
                                                     disabled = false,
                                                     ariaLabel = "Role",
                                                 }: RoleSelectProps<TRole>) {
    const [isPending, startTransition] = useTransition();

    const currentOption = options.find((option) => option.value === value);

    function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const nextRole = event.target.value as TRole;

        startTransition(async () => {
            await onChange(nextRole);
        });
    }

    return (
        <div className="relative inline-flex items-center">
            {currentOption && (
                <span
                    className={`pointer-events-none absolute left-2.5 size-1.5 rounded-full ${currentOption.dotColor}`}
    />
)}

    <select
        value={value}
    onChange={handleChange}
    disabled={disabled || isPending}
    aria-label={ariaLabel}
    className="h-8 rounded-lg border border-slate-200 bg-white/70 py-0 pl-6 pr-7 text-xs font-semibold text-slate-700 outline-none transition disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
        {options.map((option) => (
                <option key={option.value} value={option.value}>
                {option.label}
                </option>
))}
    </select>
    </div>
);
}