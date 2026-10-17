import { Check, Plus, X } from "lucide-react";

import { createSubtaskAction, deleteSubtaskAction, toggleSubtaskAction } from "../task-actions";

type Subtask = {
    id: string;
    title: string;
    completed: boolean;
    position: number;
};

type SubtasksSectionProps = {
    subtasks: Subtask[];
    slug: string;
    projectId: string;
    taskId: string;
    canEdit?: boolean;
};

function checkClass(completed: boolean) {
    return `flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
        completed ? "border-status-done bg-status-done text-white" : "border-muted-foreground/50"
    }`;
}

/** A small ring that fills as subtasks get done. */
function ProgressRing({ value }: { value: number }) {
    const radius = 7;
    const circumference = 2 * Math.PI * radius;
    return (
        <svg viewBox="0 0 18 18" className="size-4 -rotate-90" aria-hidden="true">
            <circle cx="9" cy="9" r={radius} fill="none" strokeWidth="2.5" className="stroke-foreground/10" />
            <circle
                cx="9"
                cy="9"
                r={radius}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - value / 100)}
                className={value === 100 ? "stroke-status-done" : "stroke-brand"}
            />
        </svg>
    );
}

export function SubtasksSection({ subtasks, slug, projectId, taskId, canEdit = true }: SubtasksSectionProps) {
    const total = subtasks.length;
    const completedCount = subtasks.filter((subtask) => subtask.completed).length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    if (!canEdit && total === 0) return null;

    const createSubtask = createSubtaskAction.bind(null, slug, projectId, taskId);

    return (
        <section aria-labelledby="subtasks-heading">
            <div className="flex items-center gap-2.5">
                <h2 id="subtasks-heading" className="text-sm font-semibold text-foreground">
                    Subtasks
                </h2>
                {total > 0 && (
                    <span
                        role="progressbar"
                        aria-label="Subtask progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        className="flex items-center gap-1.5 text-[13px] tabular-nums text-muted-foreground"
                    >
                        <ProgressRing value={progress} />
                        {completedCount} of {total} done
                    </span>
                )}
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-border">
                {total > 0 && (
                    <ul className="divide-y divide-border">
                        {subtasks.map((subtask) => (
                            <li
                                key={subtask.id}
                                className="group flex min-h-11 items-center gap-3 px-3.5 py-2 transition-colors hover:bg-muted/40"
                            >
                                {canEdit ? (
                                    <form action={toggleSubtaskAction.bind(null, slug, projectId, taskId, subtask.id)}>
                                        <button
                                            type="submit"
                                            aria-label={
                                                subtask.completed
                                                    ? `Mark "${subtask.title}" not done`
                                                    : `Mark "${subtask.title}" done`
                                            }
                                            className={`${checkClass(subtask.completed)} outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                                                subtask.completed ? "" : "hover:border-status-done hover:bg-status-done/10"
                                            }`}
                                        >
                                            {subtask.completed && <Check className="size-3" strokeWidth={3} />}
                                        </button>
                                    </form>
                                ) : (
                                    <span aria-hidden="true" className={checkClass(subtask.completed)}>
                                        {subtask.completed && <Check className="size-3" strokeWidth={3} />}
                                    </span>
                                )}

                                <span
                                    className={`min-w-0 flex-1 break-words text-sm ${
                                        subtask.completed
                                            ? "text-muted-foreground line-through decoration-muted-foreground/50"
                                            : "text-foreground"
                                    }`}
                                >
                                    {subtask.title}
                                    {subtask.completed && <span className="sr-only"> (done)</span>}
                                </span>

                                {canEdit && (
                                    <form action={deleteSubtaskAction.bind(null, slug, projectId, taskId, subtask.id)}>
                                        <button
                                            type="submit"
                                            aria-label={`Delete "${subtask.title}"`}
                                            title="Delete subtask"
                                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                                        >
                                            <X className="size-3.5" aria-hidden="true" />
                                        </button>
                                    </form>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {canEdit && (
                    <form
                        action={createSubtask}
                        className={`flex items-center gap-3 px-3.5 ${total > 0 ? "border-t border-border" : ""}`}
                    >
                        <Plus className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                        <label htmlFor="new-subtask" className="sr-only">
                            New subtask
                        </label>
                        <input
                            id="new-subtask"
                            name="title"
                            type="text"
                            required
                            maxLength={200}
                            placeholder={total ? "Add a subtask" : "Break this task into smaller steps"}
                            className="peer h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <button
                            type="submit"
                            className="h-7 shrink-0 rounded-md px-2.5 text-xs font-semibold text-brand opacity-0 outline-none transition-opacity hover:bg-brand-soft focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand peer-focus:opacity-100 peer-[:not(:placeholder-shown)]:opacity-100 dark:hover:bg-brand/15"
                        >
                            Add
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}
