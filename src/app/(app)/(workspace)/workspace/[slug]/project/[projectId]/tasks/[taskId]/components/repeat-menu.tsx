"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Repeat } from "lucide-react";

import { RECURRENCE_LABELS, RECURRENCES, type Recurrence } from "@/lib/tasks/recurrence";
import { setTaskRecurrenceAction } from "../../../planning-actions";
import { PropertyMenu } from "./property-menu";

const pill =
    "inline-flex h-8 max-w-full items-center gap-2 rounded-full px-3 text-[13px] font-medium text-foreground ring-1 ring-inset";
const tint = (on: boolean) => (on ? "bg-brand-soft/70 ring-brand/25 dark:bg-brand/10" : "bg-foreground/[0.04] ring-foreground/10");

/**
 * How often the task repeats. When a repeating task is marked done, the
 * next one is created with the next due date.
 */
export function RepeatMenu({
    slug,
    projectId,
    taskId,
    value,
    canEdit,
}: {
    slug: string;
    projectId: string;
    taskId: string;
    value: Recurrence | null;
    canEdit: boolean;
}) {
    const [current, setCurrent] = useState(value);
    const [syncedFrom, setSyncedFrom] = useState(value);
    if (syncedFrom !== value) {
        setSyncedFrom(value);
        setCurrent(value);
    }
    const [error, setError] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const body = (
        <>
            <Repeat className={`size-4 ${current ? "text-brand" : "text-muted-foreground"}`} aria-hidden="true" />
            <span className={current ? undefined : "text-muted-foreground"}>
                {current ? RECURRENCE_LABELS[current] : "Doesn't repeat"}
            </span>
        </>
    );

    if (!canEdit) return current ? <span className={`${pill} ${tint(true)}`}>{body}</span> : null;

    function change(next: string) {
        const previous = current;
        const recurrence = (next || null) as Recurrence | null;
        setCurrent(recurrence);
        setError(null);
        startTransition(async () => {
            const result = await setTaskRecurrenceAction(slug, projectId, taskId, recurrence);
            if (result.error) {
                setCurrent(previous);
                setError(result.error);
            }
        });
    }

    return (
        <span className="contents">
            <PropertyMenu
                label="Repeat"
                value={current ?? ""}
                onSelect={change}
                triggerClassName={`${pill} ${tint(!!current)} group outline-none transition-[filter,box-shadow] hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-brand dark:hover:brightness-125`}
                trigger={
                    <>
                        {body}
                        <ChevronDown
                            className="-mr-1 size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                            aria-hidden="true"
                        />
                    </>
                }
                options={[
                    { value: "", label: "Doesn't repeat" },
                    ...RECURRENCES.map((r) => ({ value: r, label: RECURRENCE_LABELS[r] })),
                ]}
                footer={() => (
                    <p className="border-t border-border px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
                        When it&apos;s marked done, the next one is added with its new due date.
                    </p>
                )}
            />
            {error && (
                <span role="alert" className="text-xs font-medium text-danger">
                    {error}
                </span>
            )}
        </span>
    );
}
