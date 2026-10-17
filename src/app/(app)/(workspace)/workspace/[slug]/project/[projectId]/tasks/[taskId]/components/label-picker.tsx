"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Check, Plus, Search, Tag } from "lucide-react";

import { LabelChip } from "@/components/ui/LabelChip";
import { labelColor, LABEL_NAME_MAX, normalizeLabelName, sortLabels, type TaskLabelView } from "@/lib/labels/label-colors";
import { createLabelAction, setTaskLabelsAction } from "../../../label-actions";

type Option = { kind: "label"; label: TaskLabelView } | { kind: "create"; name: string };

/**
 * The task's labels as chips, and a menu to tick labels on or off or
 * create a new one by typing its name. Changes save straight away.
 */
export function LabelPicker({
    slug,
    projectId,
    taskId,
    projectLabels,
    initialSelected,
    canEdit,
}: {
    slug: string;
    projectId: string;
    taskId: string;
    projectLabels: TaskLabelView[];
    initialSelected: string[];
    canEdit: boolean;
}) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [labels, setLabels] = useState(() => sortLabels(projectLabels));
    const [selected, setSelected] = useState(initialSelected);
    // Fresh data after a save or a live refresh: adopt it without closing the menu.
    const [syncedFrom, setSyncedFrom] = useState({ projectLabels, initialSelected });
    if (syncedFrom.projectLabels !== projectLabels || syncedFrom.initialSelected !== initialSelected) {
        setSyncedFrom({ projectLabels, initialSelected });
        setLabels(sortLabels(projectLabels));
        setSelected(initialSelected);
    }
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startTransition] = useTransition();

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const chosen = labels.filter((l) => selected.includes(l.id));
    const trimmed = query.trim().replace(/\s+/g, " ");
    const matches = labels.filter((l) => l.name.toLowerCase().includes(trimmed.toLowerCase()));
    const exact = labels.some((l) => normalizeLabelName(l.name) === normalizeLabelName(trimmed));
    const options: Option[] = [
        ...matches.map((label) => ({ kind: "label" as const, label })),
        ...(trimmed && !exact && trimmed.length <= LABEL_NAME_MAX ? [{ kind: "create" as const, name: trimmed }] : []),
    ];

    function save(next: string[]) {
        const previous = selected;
        setSelected(next);
        setError(null);
        startTransition(async () => {
            const result = await setTaskLabelsAction(slug, projectId, taskId, next);
            if (result.error) {
                setSelected(previous);
                setError(result.error);
            }
        });
    }

    function toggle(id: string) {
        save(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    }

    function create(name: string) {
        setError(null);
        startTransition(async () => {
            const result = await createLabelAction(slug, projectId, name);
            if (result.error !== undefined) {
                setError(result.error);
                return;
            }
            const label = result.label;
            setLabels((all) => (all.some((l) => l.id === label.id) ? all : sortLabels([...all, label])));
            setQuery("");
            const next = selected.includes(label.id) ? selected : [...selected, label.id];
            setSelected(next);
            const saved = await setTaskLabelsAction(slug, projectId, taskId, next);
            if (saved.error) {
                setSelected(selected);
                setError(saved.error);
            }
        });
    }

    function pick(option: Option | undefined) {
        if (!option) return;
        if (option.kind === "label") toggle(option.label.id);
        else create(option.name);
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (options.length ? (i + step + options.length) % options.length : 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            pick(options[active]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            buttonRef.current?.focus();
        }
    }

    if (!canEdit) {
        if (chosen.length === 0) return null;
        return (
            <ul aria-label="Labels" className="flex flex-wrap items-center gap-1.5">
                {chosen.map((l) => (
                    <li key={l.id}>
                        <LabelChip name={l.name} color={l.color} />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={chosen.length ? `Labels: ${chosen.map((l) => l.name).join(", ")}` : "Add labels"}
                onClick={() => {
                    setOpen((v) => !v);
                    setQuery("");
                    setActive(0);
                    setError(null);
                }}
                className="group flex min-h-8 flex-wrap items-center gap-1.5 rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
                {chosen.map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
                <span
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full text-[13px] font-medium text-muted-foreground transition-colors group-hover:bg-foreground/[0.05] group-hover:text-foreground ${
                        chosen.length ? "w-8 justify-center" : "border border-dashed border-foreground/20 px-3"
                    }`}
                >
                    {chosen.length ? <Plus className="size-4" aria-hidden="true" /> : <Tag className="size-3.5" aria-hidden="true" />}
                    {!chosen.length && "Add label"}
                </span>
            </button>

            {open && (
                <div
                    onKeyDown={onKeyDown}
                    className="absolute left-0 top-full z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-12px_rgba(15,17,21,0.28)] motion-safe:animate-[shell-pop_120ms_ease-out]"
                >
                    <div className="flex items-center gap-2 border-b border-border px-3">
                        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <input
                            autoFocus
                            value={query}
                            maxLength={LABEL_NAME_MAX}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setActive(0);
                            }}
                            placeholder={labels.length ? "Find or create a label…" : "Name your first label…"}
                            aria-label="Find or create a label"
                            role="combobox"
                            aria-expanded="true"
                            aria-controls={listId}
                            aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
                            className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <ul id={listId} role="listbox" aria-label="Labels" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1">
                        {options.length === 0 && (
                            <li className="px-2.5 py-2 text-[13px] text-muted-foreground">
                                {labels.length ? "No labels match." : "Type a name to create a label."}
                            </li>
                        )}
                        {options.map((option, index) =>
                            option.kind === "label" ? (
                                <li
                                    key={option.label.id}
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={selected.includes(option.label.id)}
                                    onMouseMove={() => setActive(index)}
                                    onClick={() => pick(option)}
                                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground ${
                                        index === active ? "bg-muted" : ""
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                            selected.includes(option.label.id) ? "border-brand bg-brand text-white dark:text-[#0f1115]" : "border-foreground/25"
                                        }`}
                                    >
                                        {selected.includes(option.label.id) && <Check className="size-3" strokeWidth={3} />}
                                    </span>
                                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${labelColor(option.label.color).dot}`} />
                                    <span className="min-w-0 flex-1 truncate">{option.label.name}</span>
                                </li>
                            ) : (
                                <li
                                    key="create"
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={false}
                                    onMouseMove={() => setActive(index)}
                                    onClick={() => pick(option)}
                                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground ${
                                        index === active ? "bg-muted" : ""
                                    }`}
                                >
                                    <Plus className="size-4 shrink-0 text-brand" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">
                                        Create label <span className="font-semibold">“{option.name}”</span>
                                    </span>
                                </li>
                            ),
                        )}
                    </ul>
                    {(error || isSaving) && (
                        <p
                            role={error ? "alert" : "status"}
                            className={`border-t border-border px-3 py-2 text-xs ${error ? "font-medium text-danger" : "text-muted-foreground"}`}
                        >
                            {error ?? "Saving…"}
                        </p>
                    )}
                </div>
            )}
            {!open && error && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}
