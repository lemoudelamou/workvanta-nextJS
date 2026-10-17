"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Lock, Plus, Search, X } from "lucide-react";

import { addDependencyAction, removeDependencyAction } from "../../../planning-actions";
import { statusMeta } from "./task-meta";

export type LinkedTask = { id: string; title: string; status: string };

function StatusDot({ status }: { status: string }) {
    return <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusMeta(status).dot}`} />;
}

/**
 * "Blocked by" (tasks that need to be done first) and "Blocking" (tasks
 * waiting for this one). Editors add blockers by searching the project's
 * tasks and remove them with the ×.
 */
export function DependenciesSection({
    slug,
    projectId,
    taskId,
    blockedBy,
    blocking,
    candidates,
    canEdit,
}: {
    slug: string;
    projectId: string;
    taskId: string;
    blockedBy: LinkedTask[];
    blocking: LinkedTask[];
    /** Other tasks in the project that could be picked as a blocker. */
    candidates: LinkedTask[];
    canEdit: boolean;
}) {
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const base = `/workspace/${slug}/project/${projectId}/tasks`;
    const open = blockedBy.filter((t) => t.status !== "DONE").length;

    if (!canEdit && blockedBy.length === 0 && blocking.length === 0) return null;

    function run(action: () => Promise<{ error?: string }>) {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (result.error) setError(result.error);
        });
    }

    const add = (id: string) => run(() => addDependencyAction(slug, projectId, taskId, id));
    const remove = (blockedId: string, blockingId: string) =>
        run(() => removeDependencyAction(slug, projectId, blockedId, blockingId));

    const taken = new Set(blockedBy.map((t) => t.id));

    return (
        <section aria-labelledby="dependencies-heading">
            <div className="flex flex-wrap items-center gap-2.5">
                <h2 id="dependencies-heading" className="text-sm font-semibold text-foreground">
                    Dependencies
                </h2>
                {open > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <Lock className="size-3" aria-hidden="true" />
                        Waiting on {open} {open === 1 ? "task" : "tasks"}
                    </span>
                )}
                {pending && <span role="status" className="text-xs text-muted-foreground">Saving…</span>}
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <Group
                    title="Blocked by"
                    empty={canEdit ? "Nothing. Add a task that has to be done first." : "Nothing."}
                    tasks={blockedBy}
                    base={base}
                    onRemove={canEdit ? (id) => remove(taskId, id) : undefined}
                    removeLabel={(t) => `Remove “${t.title}” as a blocker`}
                >
                    {canEdit && (
                        <BlockerPicker
                            candidates={candidates.filter((t) => !taken.has(t.id))}
                            onPick={add}
                            divided={blockedBy.length > 0}
                        />
                    )}
                </Group>
                {blocking.length > 0 && (
                    <Group
                        title="Blocking"
                        tasks={blocking}
                        base={base}
                        onRemove={canEdit ? (id) => remove(id, taskId) : undefined}
                        removeLabel={(t) => `Stop “${t.title}” waiting on this task`}
                        bordered
                    />
                )}
            </div>

            {error && (
                <p role="alert" className="mt-2 text-sm font-medium text-danger">
                    {error}
                </p>
            )}
        </section>
    );
}

function Group({
    title,
    empty,
    tasks,
    base,
    onRemove,
    removeLabel,
    bordered,
    children,
}: {
    title: string;
    empty?: string;
    tasks: LinkedTask[];
    base: string;
    onRemove?: (id: string) => void;
    removeLabel: (task: LinkedTask) => string;
    bordered?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className={bordered ? "border-t border-border" : undefined}>
            <h3 className="bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">{title}</h3>
            {tasks.length === 0 && empty && !children && <p className="px-3.5 py-3 text-sm text-muted-foreground">{empty}</p>}
            {tasks.length > 0 && (
                <ul className="divide-y divide-border">
                    {tasks.map((task) => (
                        <li key={task.id} className="group flex min-h-11 items-center gap-3 px-3.5 py-2 transition-colors hover:bg-muted/40">
                            <StatusDot status={task.status} />
                            <Link
                                href={`${base}/${task.id}`}
                                className={`min-w-0 flex-1 truncate rounded-sm text-sm outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand ${
                                    task.status === "DONE"
                                        ? "text-muted-foreground line-through decoration-muted-foreground/50"
                                        : "text-foreground"
                                }`}
                            >
                                {task.title}
                            </Link>
                            <span className="shrink-0 text-xs text-muted-foreground">{statusMeta(task.status).label}</span>
                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(task.id)}
                                    aria-label={removeLabel(task)}
                                    title="Remove"
                                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                                >
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {children}
        </div>
    );
}

function BlockerPicker({
    candidates,
    onPick,
    divided,
}: {
    candidates: LinkedTask[];
    onPick: (id: string) => void;
    /** Draw a line above when there are rows over it. */
    divided: boolean;
}) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const q = query.trim().toLowerCase();
    // Open tasks first: they're the ones that can still hold this one up.
    const matches = candidates
        .filter((t) => t.title.toLowerCase().includes(q))
        .sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE"))
        .slice(0, 8);

    function pick(task: LinkedTask | undefined) {
        if (!task) return;
        onPick(task.id);
        setQuery("");
        setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            pick(matches[active]);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    return (
        <div ref={rootRef} className={`relative ${divided ? "border-t border-border" : ""}`}>
            <div className="flex items-center gap-3 px-3.5">
                <Plus className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
                    aria-label="Add a blocker: search this project's tasks"
                    placeholder={candidates.length ? "Add a task this one waits on" : "No other tasks in this project yet"}
                    disabled={candidates.length === 0}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                />
                {open && <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </div>
            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Tasks"
                    className="absolute inset-x-2 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-[0_16px_40px_-12px_rgba(15,17,21,0.28)]"
                >
                    {matches.length === 0 ? (
                        <li className="px-2.5 py-2 text-[13px] text-muted-foreground">No tasks match.</li>
                    ) : (
                        matches.map((task, index) => (
                            <li
                                key={task.id}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onMouseMove={() => setActive(index)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => pick(task)}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-foreground ${
                                    index === active ? "bg-muted" : ""
                                }`}
                            >
                                <StatusDot status={task.status} />
                                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">{statusMeta(task.status).label}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
