"use client";

import Image from "next/image";
import { useState, useTransition, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Loader2, X } from "lucide-react";

import { personColor } from "@/lib/ui/person-color";
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

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

/** The due date is stored as the end of that day; show the calendar day. */
function formatDay(value: string) {
    return DATE.format(new Date(`${value}T12:00:00Z`));
}

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
            style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
            {person.image ? (
                <Image src={person.image} alt="" fill className="object-cover" sizes={`${size}px`} />
            ) : (
                getInitials(person.name, person.email)
            )}
        </span>
    );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
    return (
        <div className="grid min-h-10 grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
            {htmlFor ? (
                <label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
                    {label}
                </label>
            ) : (
                <span className="text-[13px] text-muted-foreground">{label}</span>
            )}
            <div className="min-w-0">{children}</div>
        </div>
    );
}

/** A native select dressed as a quiet button, with an icon in front. */
function PropertySelect({
    id,
    value,
    onChange,
    disabled,
    leading,
    tone,
    children,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    leading: ReactNode;
    tone?: string;
    children: ReactNode;
}) {
    return (
        <div className="group relative flex items-center">
            <span className="pointer-events-none absolute left-2 flex items-center">{leading}</span>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className={`h-8 w-full min-w-0 cursor-pointer appearance-none truncate rounded-md bg-transparent pl-8 pr-7 text-sm font-medium outline-none transition-colors hover:bg-foreground/[0.05] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait dark:[color-scheme:dark] ${tone ?? "text-foreground"}`}
            >
                {children}
            </select>
            <ChevronDown
                className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
            />
        </div>
    );
}

export function TaskProperties({
    values,
    people,
    assignee,
    overdue,
    canEdit,
    updateTask,
    footer,
}: {
    values: TaskValues;
    people: Person[];
    /** The current assignee, even if they're no longer in the project audience. */
    assignee: Person | null;
    overdue: boolean;
    canEdit: boolean;
    updateTask: UpdateTask;
    /** Read-only rows under the editable ones (created by, created…). */
    footer?: ReactNode;
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

    const assigned = people.find((p) => p.id === current.assigneeId) ?? (assignee?.id === current.assigneeId ? assignee : null);
    const status = statusMeta(current.status);
    const priority = priorityMeta(current.priority);

    return (
        <div>
            <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
                <h2 className="text-[13px] font-semibold text-foreground">Properties</h2>
                {isSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                        <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
                        Saving
                    </span>
                )}
            </div>

            <div className="grid px-4 pb-2 sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-1">
                {canEdit ? (
                    <>
                        <Row label="Status" htmlFor="task-status">
                            <PropertySelect
                                id="task-status"
                                value={current.status}
                                onChange={(v) => change("status", v)}
                                leading={<StatusDot status={current.status} />}
                            >
                                {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </PropertySelect>
                        </Row>
                        <Row label="Priority" htmlFor="task-priority">
                            <PropertySelect
                                id="task-priority"
                                value={current.priority}
                                onChange={(v) => change("priority", v)}
                                leading={<PriorityBars priority={current.priority} />}
                            >
                                {PRIORITY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </PropertySelect>
                        </Row>
                        <Row label="Assignee" htmlFor="task-assignee">
                            <PropertySelect
                                id="task-assignee"
                                value={current.assigneeId}
                                onChange={(v) => change("assigneeId", v)}
                                tone={assigned ? "text-foreground" : "text-muted-foreground"}
                                leading={
                                    assigned ? (
                                        <PersonAvatar person={assigned} />
                                    ) : (
                                        <span className="size-5 rounded-full border border-dashed border-muted-foreground/60" />
                                    )
                                }
                            >
                                <option value="">Unassigned</option>
                                {assignee && !people.some((p) => p.id === assignee.id) && (
                                    <option value={assignee.id}>{assignee.name ?? assignee.email}</option>
                                )}
                                {people.map((person) => (
                                    <option key={person.id} value={person.id}>
                                        {person.name ?? person.email}
                                    </option>
                                ))}
                            </PropertySelect>
                        </Row>
                        <Row label="Due date" htmlFor="task-due">
                            <div className="group relative flex h-8 items-center rounded-md transition-colors focus-within:ring-2 focus-within:ring-brand hover:bg-foreground/[0.05]">
                                <CalendarDays
                                    className={`pointer-events-none absolute left-2 size-4 ${overdue ? "text-danger" : "text-muted-foreground"}`}
                                    aria-hidden="true"
                                />
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none truncate pl-8 pr-7 text-sm font-medium ${
                                        overdue ? "text-danger" : current.dueDate ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    {current.dueDate ? formatDay(current.dueDate) : "No due date"}
                                </span>
                                {/* The real control sits invisibly on top, so a click anywhere opens the picker. */}
                                <input
                                    id="task-due"
                                    type="date"
                                    value={current.dueDate}
                                    onChange={(event) => change("dueDate", event.target.value)}
                                    onClick={(event) => {
                                        try {
                                            event.currentTarget.showPicker?.();
                                        } catch {
                                            // Not allowed in this browser; the native control still works.
                                        }
                                    }}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                />
                                {current.dueDate && (
                                    <button
                                        type="button"
                                        onClick={() => change("dueDate", "")}
                                        aria-label="Clear due date"
                                        title="Clear due date"
                                        className="absolute right-1 z-10 flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </Row>
                    </>
                ) : (
                    <>
                        <Row label="Status">
                            <span className="flex items-center gap-2.5 px-2 text-sm font-medium text-foreground">
                                <StatusDot status={current.status} />
                                {status.label}
                            </span>
                        </Row>
                        <Row label="Priority">
                            <span className="flex items-center gap-2.5 px-2 text-sm font-medium text-foreground">
                                <PriorityBars priority={current.priority} />
                                {priority.label}
                            </span>
                        </Row>
                        <Row label="Assignee">
                            {assignee ? (
                                <span className="flex min-w-0 items-center gap-2 px-2 text-sm font-medium text-foreground">
                                    <PersonAvatar person={assignee} />
                                    <span className="truncate">{assignee.name ?? assignee.email}</span>
                                </span>
                            ) : (
                                <span className="px-2 text-sm text-muted-foreground">Unassigned</span>
                            )}
                        </Row>
                        <Row label="Due date">
                            {current.dueDate ? (
                                <span className={`px-2 text-sm font-medium ${overdue ? "text-danger" : "text-foreground"}`}>
                                    {formatDay(current.dueDate)}
                                    {overdue ? " (overdue)" : ""}
                                </span>
                            ) : (
                                <span className="px-2 text-sm text-muted-foreground">No due date</span>
                            )}
                        </Row>
                    </>
                )}
                {canEdit && overdue && (
                    <p className="-mt-1 mb-1 pl-[96px] text-xs font-medium text-danger sm:col-start-2 xl:col-start-1">Overdue</p>
                )}
            </div>

            {error && (
                <p role="alert" className="mx-4 mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                    {error}
                </p>
            )}

            {footer && <dl className="grid border-t border-border px-4 py-2 sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-1">{footer}</dl>}
        </div>
    );
}

/** Plain label/value row for the read-only part of the panel. */
export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid min-h-9 grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
            <dt className="text-[13px] text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate px-2 text-sm text-foreground">{children}</dd>
        </div>
    );
}
