import { Check, Plus } from "lucide-react";
import { fieldClass, subtaskButton } from "@/app/style/ui-tokens";

import { createSubtaskAction, toggleSubtaskAction } from "../task-actions";

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



function checkboxClass(completed: boolean) {
    const base = "flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200";

    return completed
        ? `${base} border-status-done bg-status-done text-white`
        : `${base} border-slate-300 bg-white/70 dark:border-white/[0.2] dark:bg-white/[0.04]`;
}

export function SubtasksSection({
                                    subtasks,
                                    slug,
                                    projectId,
                                    taskId,
                                    canEdit = true,
                                }: SubtasksSectionProps) {
    const total = subtasks.length;
    const completedCount = subtasks.filter((subtask) => subtask.completed).length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const createSubtask = createSubtaskAction.bind(null, slug, projectId, taskId);

    return (
        <section className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-foreground">Subtasks</h2>
                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {completedCount} of {total} completed
                </span>
                {total > 0 && (
                    <div
                        role="progressbar"
                        aria-label="Subtask progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        className="ml-auto h-1.5 min-w-6 max-w-28 flex-1 overflow-hidden rounded-full bg-muted"
                    >
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-status-done" : "bg-brand"}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {total === 0 ? (
                <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-5">
                    No subtasks yet.{canEdit ? " Break this task into smaller steps below." : ""}
                </p>
            ) : (
                <div className="divide-y divide-border border-t border-border">
                    {subtasks.map((subtask) => {
                        const check = subtask.completed && (
                            <Check className="size-3" strokeWidth={3} />
                        );

                        return (
                            <div
                                key={subtask.id}
                                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40 sm:px-5"
                            >
                                {canEdit ? (
                                    <form
                                        action={toggleSubtaskAction.bind(
                                            null,
                                            slug,
                                            projectId,
                                            taskId,
                                            subtask.id,
                                        )}
                                    >
                                        <button
                                            type="submit"
                                            aria-label={
                                                subtask.completed
                                                    ? "Mark subtask incomplete"
                                                    : "Mark subtask complete"
                                            }
                                            className={`${checkboxClass(subtask.completed)} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                                subtask.completed
                                                    ? ""
                                                    : "hover:border-slate-500 dark:hover:border-white/40"
                                            }`}
                                        >
                                            {check}
                                        </button>
                                    </form>
                                ) : (
                                    <span aria-hidden="true" className={checkboxClass(subtask.completed)}>
                    {check}
                  </span>
                                )}

                                <span
                                    className={`min-w-0 flex-1 text-sm transition-colors ${
                                        subtask.completed
                                            ? "text-slate-500 line-through decoration-slate-300 dark:text-slate-400 dark:decoration-slate-600"
                                            : "text-foreground"
                                    }`}
                                >
                  {subtask.title}
                                    {!canEdit && subtask.completed && (
                                        <span className="sr-only"> (completed)</span>
                                    )}
                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {canEdit && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
                    <form action={createSubtask} className="flex gap-2">
                        <input
                            name="title"
                            type="text"
                            required
                            maxLength={200}
                            placeholder="Add a subtask..."
                            className={`${fieldClass} py-2`}
                        />

                        <button type="submit" className={`${subtaskButton} h-9 px-3`}>
                            <Plus className="size-4" />
                            Add
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
}