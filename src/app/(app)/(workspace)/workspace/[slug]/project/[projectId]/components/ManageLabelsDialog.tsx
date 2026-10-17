"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Plus, Tag, Trash2, X } from "lucide-react";

import {
    LABEL_COLORS,
    LABEL_NAME_MAX,
    labelColor,
    sortLabels,
} from "@/lib/labels/label-colors";
import { createLabelAction, deleteLabelAction, updateLabelAction } from "../label-actions";

export type ManagedLabel = { id: string; name: string; color: string; taskCount: number };

function LabelRow({
    slug,
    projectId,
    label,
    onChanged,
    onDeleted,
}: {
    slug: string;
    projectId: string;
    label: ManagedLabel;
    onChanged: (label: ManagedLabel) => void;
    onDeleted: (id: string) => void;
}) {
    const [name, setName] = useState(label.name);
    const [picking, setPicking] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const colour = labelColor(label.color);

    function save(next: { name: string; color: string }) {
        if (next.name.trim() === label.name && next.color === label.color) return;
        setError(null);
        startTransition(async () => {
            const result = await updateLabelAction(slug, projectId, label.id, next);
            if (result.error) {
                setError(result.error);
                setName(label.name);
                return;
            }
            onChanged({ ...label, name: next.name.trim().replace(/\s+/g, " "), color: next.color });
        });
    }

    function remove() {
        setError(null);
        startTransition(async () => {
            const result = await deleteLabelAction(slug, projectId, label.id);
            if (result.error) {
                setError(result.error);
                setConfirming(false);
                return;
            }
            onDeleted(label.id);
        });
    }

    return (
        <li className="px-1 py-2">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setPicking((v) => !v)}
                    aria-expanded={picking}
                    aria-label={`Colour of ${label.name}: ${colour.name}`}
                    title="Change colour"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <span aria-hidden="true" className={`size-3.5 rounded-full ${colour.dot}`} />
                </button>
                <label className="sr-only" htmlFor={`label-${label.id}`}>
                    Name of {label.name}
                </label>
                <input
                    id={`label-${label.id}`}
                    value={name}
                    maxLength={LABEL_NAME_MAX}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => save({ name, color: label.color })}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                        } else if (event.key === "Escape") {
                            event.stopPropagation();
                            setName(label.name);
                        }
                    }}
                    disabled={isPending}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-foreground outline-none transition-colors hover:border-border focus:border-brand focus:ring-4 focus:ring-brand/15"
                />
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {label.taskCount} {label.taskCount === 1 ? "task" : "tasks"}
                </span>
                {confirming ? (
                    <span className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={remove}
                            disabled={isPending}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-danger px-2 text-xs font-semibold text-white outline-none hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                        >
                            {isPending ? <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" /> : null}
                            Delete
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            aria-label="Keep label"
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        aria-label={`Delete ${label.name}`}
                        title="Delete label"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            {confirming && (
                <p className="mt-1 pl-10 text-xs text-muted-foreground">
                    {label.taskCount > 0
                        ? `It will be removed from ${label.taskCount} ${label.taskCount === 1 ? "task" : "tasks"}.`
                        : "No tasks use it."}
                </p>
            )}

            {picking && (
                <div role="radiogroup" aria-label={`Colour of ${label.name}`} className="mt-2 flex flex-wrap gap-1.5 pl-10">
                    {LABEL_COLORS.map((c) => (
                        <button
                            key={c.key}
                            type="button"
                            role="radio"
                            aria-checked={label.color === c.key}
                            aria-label={c.name}
                            title={c.name}
                            onClick={() => {
                                setPicking(false);
                                save({ name, color: c.key });
                            }}
                            className={`flex size-7 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-brand ${c.dot} ${
                                label.color === c.key ? "ring-2 ring-foreground/40" : ""
                            }`}
                        >
                            {label.color === c.key && <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <p role="alert" className="mt-1 pl-10 text-xs font-medium text-danger">
                    {error}
                </p>
            )}
        </li>
    );
}

/** Rename, recolour, delete and add the project's labels. */
export function ManageLabelsDialog({
    open,
    onClose,
    slug,
    projectId,
    labels: initial,
}: {
    open: boolean;
    onClose: () => void;
    slug: string;
    projectId: string;
    labels: ManagedLabel[];
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const [labels, setLabels] = useState(() => sortLabels(initial));
    const [syncedFrom, setSyncedFrom] = useState(initial);
    if (syncedFrom !== initial) {
        setSyncedFrom(initial);
        setLabels(sortLabels(initial));
    }
    const [newName, setNewName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    function add() {
        const name = newName.trim();
        if (!name) return;
        setError(null);
        startTransition(async () => {
            const result = await createLabelAction(slug, projectId, name);
            if (result.error !== undefined) {
                setError(result.error);
                return;
            }
            const created = result.label;
            setLabels((all) =>
                all.some((l) => l.id === created.id) ? all : sortLabels([...all, { ...created, taskCount: 0 }]),
            );
            setNewName("");
        });
    }

    return (
        <dialog
            ref={ref}
            aria-label="Manage labels"
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) event.currentTarget.close();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-card p-0 text-foreground shadow-[0_24px_64px_-12px_rgba(15,17,21,0.35)] backdrop:bg-[#0f1115]/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[shell-pop_140ms_ease-out]"
        >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Labels</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">Tags for this project&apos;s tasks. Changes save as you go.</p>
                </div>
                <button
                    type="button"
                    onClick={(event) => event.currentTarget.closest("dialog")?.close()}
                    aria-label="Close"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>

            <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-4 py-2">
                {labels.length === 0 ? (
                    <div className="flex flex-col items-center px-4 py-8 text-center">
                        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
                            <Tag className="size-4" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-medium text-foreground">No labels yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Add one below, like “Bug”, “Design” or “Blocked”.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {labels.map((label) => (
                            <LabelRow
                                key={label.id}
                                slug={slug}
                                projectId={projectId}
                                label={label}
                                onChanged={(next) => setLabels((all) => sortLabels(all.map((l) => (l.id === next.id ? next : l))))}
                                onDeleted={(id) => setLabels((all) => all.filter((l) => l.id !== id))}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    add();
                }}
                className="border-t border-border px-5 py-4"
            >
                <label htmlFor="new-label" className="sr-only">
                    New label name
                </label>
                <div className="flex gap-2">
                    <input
                        id="new-label"
                        value={newName}
                        maxLength={LABEL_NAME_MAX}
                        onChange={(event) => {
                            setNewName(event.target.value);
                            setError(null);
                        }}
                        placeholder="New label name"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-4 focus:ring-brand/15"
                    />
                    <button
                        type="submit"
                        disabled={isPending || !newName.trim()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white outline-none hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-50 dark:text-[#0f1115]"
                    >
                        {isPending ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                        Add label
                    </button>
                </div>
                {error && (
                    <p role="alert" className="mt-2 text-xs font-medium text-danger">
                        {error}
                    </p>
                )}
            </form>
        </dialog>
    );
}
