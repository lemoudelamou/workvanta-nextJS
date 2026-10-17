"use client";

import { useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

export interface RoleOption<TRole extends string> {
    value: TRole;
    label: string;
    dotColor: string;
}

interface RoleSelectProps<TRole extends string> {
    value: TRole;
    options: RoleOption<TRole>[];
    onChange: (nextRole: TRole) => Promise<unknown>;
    disabled?: boolean;
    ariaLabel?: string;
}

/** A role pill that changes the role as soon as a new one is picked. */
export function RoleSelect<TRole extends string>({
    value,
    options,
    onChange,
    disabled = false,
    ariaLabel = "Role",
}: RoleSelectProps<TRole>) {
    const [isPending, startTransition] = useTransition();
    const currentOption = options.find((option) => option.value === value);

    return (
        <div className="group relative inline-flex items-center">
            <span className="pointer-events-none absolute left-2.5 flex items-center">
                {isPending ? (
                    <Loader2 className="size-3 text-muted-foreground motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                    currentOption && <span className={`size-2 rounded-full ${currentOption.dotColor}`} />
                )}
            </span>
            <select
                value={value}
                onChange={(event) => {
                    const nextRole = event.target.value as TRole;
                    startTransition(async () => {
                        await onChange(nextRole);
                    });
                }}
                disabled={disabled || isPending}
                aria-label={ariaLabel}
                className="h-8 cursor-pointer appearance-none rounded-full bg-foreground/[0.05] pl-6 pr-7 text-[13px] font-medium text-foreground outline-none ring-1 ring-inset ring-foreground/10 transition-colors hover:bg-foreground/[0.08] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait disabled:opacity-60 dark:[color-scheme:dark]"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" aria-hidden="true" />
        </div>
    );
}
