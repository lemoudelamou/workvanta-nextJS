"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Search } from "lucide-react";

export type MenuOption = {
    value: string;
    label: string;
    icon?: ReactNode;
    hint?: string;
};

/**
 * A pill that opens a small list to pick from. Arrow keys move, Enter picks,
 * Escape or a click outside closes. Optional search for long lists.
 */
export function PropertyMenu({
    label,
    value,
    options,
    onSelect,
    trigger,
    triggerClassName,
    searchable,
    footer,
}: {
    /** e.g. "Status": announced with the current value. */
    label: string;
    value: string;
    options: MenuOption[];
    onSelect: (value: string) => void;
    trigger: ReactNode;
    triggerClassName: string;
    searchable?: boolean;
    /** Extra content under the list (e.g. a date input). */
    footer?: (close: () => void) => ReactNode;
}) {
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [alignRight, setAlignRight] = useState(false);

    const shown = query
        ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(query.toLowerCase()))
        : options;

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    function show() {
        const rect = buttonRef.current?.getBoundingClientRect();
        setAlignRight(!!rect && rect.left + 256 > window.innerWidth - 8);
        setQuery("");
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        setOpen(true);
        requestAnimationFrame(() => {
            const target = rootRef.current?.querySelector<HTMLElement>("[data-menu-focus]");
            target?.focus();
        });
    }

    function close(refocus = true) {
        setOpen(false);
        if (refocus) buttonRef.current?.focus();
    }

    function pick(option: MenuOption | undefined) {
        if (!option) return;
        close();
        if (option.value !== value) onSelect(option.value);
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (shown.length ? (i + step + shown.length) % shown.length : 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            pick(shown[active]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            close();
        } else if (event.key === "Tab") {
            close(false);
        }
    }

    const current = options.find((o) => o.value === value);

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`${label}: ${current?.label ?? value}`}
                onClick={() => (open ? close() : show())}
                className={triggerClassName}
            >
                {trigger}
            </button>

            {open && (
                <div
                    onKeyDown={onKeyDown}
                    className={`absolute top-full z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-12px_rgba(15,17,21,0.28)] motion-safe:animate-[shell-pop_120ms_ease-out] ${
                        alignRight ? "right-0" : "left-0"
                    }`}
                >
                    {searchable && (
                        <div className="flex items-center gap-2 border-b border-border px-3">
                            <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <input
                                data-menu-focus
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setActive(0);
                                }}
                                placeholder={`Find ${label.toLowerCase()}…`}
                                aria-label={`Find ${label.toLowerCase()}`}
                                aria-controls={id}
                                aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
                                className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                    )}
                    <ul
                        id={id}
                        role="listbox"
                        aria-label={label}
                        tabIndex={searchable ? -1 : 0}
                        data-menu-focus={searchable ? undefined : true}
                        aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
                        className="max-h-64 overflow-y-auto p-1 outline-none"
                    >
                        {shown.length === 0 && <li className="px-2.5 py-2 text-[13px] text-muted-foreground">No matches</li>}
                        {shown.map((option, index) => (
                            <li
                                key={option.value}
                                id={`${id}-${index}`}
                                role="option"
                                aria-selected={option.value === value}
                                onMouseMove={() => setActive(index)}
                                onClick={() => pick(option)}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground ${
                                    index === active ? "bg-muted" : ""
                                }`}
                            >
                                {option.icon && <span className="flex w-5 shrink-0 justify-center">{option.icon}</span>}
                                <span className="min-w-0 flex-1 truncate">
                                    {option.label}
                                    {option.hint && <span className="ml-1.5 text-muted-foreground">{option.hint}</span>}
                                </span>
                                {option.value === value && <Check className="size-3.5 shrink-0 text-brand" aria-hidden="true" />}
                            </li>
                        ))}
                    </ul>
                    {footer?.(() => setOpen(false))}
                </div>
            )}
        </div>
    );
}
