"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { CalendarDays, ChevronDown, Loader2, UserRound } from "lucide-react";

import { personColor } from "@/lib/ui/person-color";
import { PropertyMenu } from "./property-menu";
import {
    errorMessage,
    getInitials,
    isRedirect,
    PRIORITY_OPTIONS,
    priorityMeta,
    STATUS_OPTIONS,
    statusMeta,
    taskFormData,
    type TaskValues,
    type UpdateTask,
} from "./task-meta";

type Person = { id: string; name: string | null; email: string; image: string | null };

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The due date is stored as the end of that day; show the calendar day. */
export function formatDay(value: string) {
    return DAY.format(new Date(`${value}T12:00:00Z`));
}

function isoDay(date: Date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

function addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return isoDay(date);
}

// Soft tints so each property reads at a glance; same hues as the board.
const STATUS_TINT: Record<string, string> = {
    TODO: "bg-foreground/[0.05] ring-foreground/10",
    IN_PROGRESS: "bg-status-progress/10 ring-status-progress/25",
    IN_REVIEW: "bg-status-review/12 ring-status-review/30",
    DONE: "bg-status-done/10 ring-status-done/25",
};

const PRIORITY_TINT: Record<string, string> = {
    URGENT: "bg-danger/10 ring-danger/25",
    HIGH: "bg-orange-500/10 ring-orange-500/25",
    MEDIUM: "bg-amber-500/10 ring-amber-500/25",
    LOW: "bg-sky-500/10 ring-sky-500/25",
};

const NEUTRAL_TINT = "bg-foreground/[0.04] ring-foreground/10";

const pill =
    "inline-flex h-8 max-w-full items-center gap-2 rounded-full px-3 text-[13px] font-medium text-foreground ring-1 ring-inset";
const interactive =
    "group outline-none transition-[filter,box-shadow] hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-brand dark:hover:brightness-125";

export function StatusDot({ status }: { status: string }) {
    return <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${statusMeta(status).dot}`} />;
}

/** Four rising bars, filled up to the priority. */
export function PriorityBars({ priority }: { priority: string }) {
    const { bars, dot } = priorityMeta(priority);
    return (
        <span aria-hidden="true" className="flex h-3 shrink-0 items-end gap-[2px]">
            {[1, 2, 3, 4].map((bar) => (
                <span
                    key={bar}
                    className={`w-[3px] rounded-[1px] ${bar <= bars ? dot : "bg-foreground/15"}`}
                    style={{ height: `${bar * 25}%` }}
                />
            ))}
        </span>
    );
}

export function PersonAvatar({ person, size = 20 }: { person: Person; size?: number }) {
    return (
        <span
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${personColor(person.email)}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
        >
            {person.image ? (
                <Image src={person.image} alt="" fill className="object-cover" sizes={`${size}px`} />
            ) : (
                getInitials(person.name, person.email)
            )}
        </span>
    );
}

const Caret = () => (
    <ChevronDown
        className="-mr-1 size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
    />
);

/**
 * Status, priority, assignee and due date as pills under the title. For
 * editors each opens a small menu and saves straight away.
 */
export function TaskProperties({
    values,
    people,
    assignee,
    overdue,
    canEdit,
    updateTask,
}: {
    values: TaskValues;
    people: Person[];
    /** The current assignee, even if they're no longer in the project audience. */
    assignee: Person | null;
    overdue: boolean;
    canEdit: boolean;
    updateTask: UpdateTask;
}) {
    const [current, setCurrent] = useState(values);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startTransition] = useTransition();

    function change(field: keyof TaskValues, value: string) {
        const previous = current;
        const next = { ...current, [field]: value };
        setCurrent(next);
        setError(null);

        startTransition(async () => {
            try {
                await updateTask(taskFormData(next));
            } catch (err) {
                if (isRedirect(err)) throw err;
                setCurrent(previous);
                setError(errorMessage(err, "Couldn't save that change. Please try again."));
            }
        });
    }

    const everyone = assignee && !people.some((p) => p.id === assignee.id) ? [assignee, ...people] : people;
    const assigned =
        assignee?.id === current.assigneeId ? assignee : (everyone.find((p) => p.id === current.assigneeId) ?? null);
    const status = statusMeta(current.status);
    const priority = priorityMeta(current.priority);
    // Overdue is worked out on the server; drop it as soon as the date changes.
    const late = overdue && current.dueDate === values.dueDate && current.status !== "DONE";

    const statusPill = (
        <>
            <StatusDot status={current.status} />
            <span className="truncate">{status.label}</span>
        </>
    );
    const priorityPill = (
        <>
            <PriorityBars priority={current.priority} />
            <span className="truncate">{priority.label}</span>
        </>
    );
    const assigneePill = assigned ? (
        <>
            <span className="-ml-1.5">
                <PersonAvatar person={assigned} size={22} />
            </span>
            <span className="truncate">{assigned.name ?? assigned.email}</span>
        </>
    ) : (
        <>
            <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Unassigned</span>
        </>
    );
    const duePill = (
        <>
            <CalendarDays className={`size-4 ${late ? "text-danger" : "text-muted-foreground"}`} aria-hidden="true" />
            {current.dueDate ? (
                <span className={late ? "text-danger" : undefined}>
                    {formatDay(current.dueDate)}
                    {late ? " (overdue)" : ""}
                </span>
            ) : (
                <span className="text-muted-foreground">No due date</span>
            )}
        </>
    );

    const statusTint = STATUS_TINT[current.status] ?? NEUTRAL_TINT;
    const priorityTint = PRIORITY_TINT[current.priority] ?? NEUTRAL_TINT;
    const dueTint = late ? "bg-danger/10 ring-danger/25" : NEUTRAL_TINT;

    if (!canEdit) {
        return (
            <ul aria-label="Task properties" className="flex flex-wrap items-center gap-2">
                <li className={`${pill} ${statusTint}`}>{statusPill}</li>
                <li className={`${pill} ${priorityTint}`}>{priorityPill}</li>
                <li className={`${pill} ${NEUTRAL_TINT}`}>{assigneePill}</li>
                <li className={`${pill} ${dueTint}`}>{duePill}</li>
            </ul>
        );
    }

    const dayOptions = [
        { value: addDays(0), label: "Today" },
        { value: addDays(1), label: "Tomorrow" },
        { value: addDays(7), label: "In a week" },
        ...(current.dueDate ? [{ value: "", label: "Remove due date" }] : []),
    ].map((o) => ({ ...o, hint: o.value ? formatDay(o.value).replace(/, \d{4}$/, "") : undefined }));

    return (
        <div aria-label="Task properties" role="group">
            <div className="flex flex-wrap items-center gap-2">
                <PropertyMenu
                    label="Status"
                    value={current.status}
                    onSelect={(v) => change("status", v)}
                    triggerClassName={`${pill} ${interactive} ${statusTint}`}
                    trigger={<>{statusPill}<Caret /></>}
                    options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: <StatusDot status={o.value} /> }))}
                />
                <PropertyMenu
                    label="Priority"
                    value={current.priority}
                    onSelect={(v) => change("priority", v)}
                    triggerClassName={`${pill} ${interactive} ${priorityTint}`}
                    trigger={<>{priorityPill}<Caret /></>}
                    options={PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: <PriorityBars priority={o.value} /> }))}
                />
                <PropertyMenu
                    label="Assignee"
                    value={current.assigneeId}
                    onSelect={(v) => change("assigneeId", v)}
                    searchable={everyone.length > 6}
                    triggerClassName={`${pill} ${interactive} ${NEUTRAL_TINT}`}
                    trigger={<>{assigneePill}<Caret /></>}
                    options={[
                        {
                            value: "",
                            label: "Unassigned",
                            icon: <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />,
                        },
                        ...everyone.map((person) => ({
                            value: person.id,
                            label: person.name ?? person.email,
                            icon: <PersonAvatar person={person} />,
                        })),
                    ]}
                />
                <PropertyMenu
                    label="Due date"
                    value={current.dueDate}
                    onSelect={(v) => change("dueDate", v)}
                    triggerClassName={`${pill} ${interactive} ${dueTint}`}
                    trigger={<>{duePill}<Caret /></>}
                    options={dayOptions}
                    footer={(close) => (
                        <label className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2.5 text-[13px] text-muted-foreground">
                            Pick a date
                            <input
                                type="date"
                                aria-label="Due date"
                                value={current.dueDate}
                                onChange={(event) => {
                                    if (!event.target.value) return;
                                    change("dueDate", event.target.value);
                                    close();
                                }}
                                className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-brand dark:[color-scheme:dark]"
                            />
                        </label>
                    )}
                />

                {isSaving && (
                    <span role="status" className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
                        Saving
                    </span>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-2 text-sm font-medium text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

