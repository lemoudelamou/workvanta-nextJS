import { Check, ListChecks, Plus } from "lucide-react";
import { hairline, glass, starlightEdge, iconTile, fieldClass, subtaskButton } from "@/app/style/ui-tokens";

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
        ? `${base} border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950`
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
        <section
            className={`${glass} ${hairline} ${starlightEdge} relative overflow-hidden rounded-xl`}
        >
            <div className="relative flex items-center justify-between gap-4 border-b border-slate-200/70 px-5 py-4 sm:px-6 dark:border-white/[0.06]">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-sm font-semibold tracking-tight text-foreground">
                            Subtasks
                        </h2>

                        <span
                            className={`${hairline} rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/[0.04] dark:text-slate-300`}
                        >
              {completedCount}/{total}
            </span>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {completedCount} of {total} completed
                    </p>
                </div>

                <div className={`${iconTile} hidden size-9 rounded-xl sm:flex`}>
                    <ListChecks className="size-4" />
                </div>

                <div
                    role="progressbar"
                    aria-label="Subtask progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-transparent"
                >
                    <div
                        className="h-full rounded-r-full bg-slate-950 transition-all duration-500 dark:bg-white"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {total === 0 ? (
                <div className="px-5 py-10 text-center sm:px-6">
          <span className={`${iconTile} mx-auto size-11 rounded-xl border-dashed`}>
            <ListChecks className="size-5" />
          </span>

                    <p className="mt-4 text-sm font-medium text-foreground">
                        No subtasks yet.
                    </p>

                    {canEdit && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Break this task into smaller steps below.
                        </p>
                    )}
                </div>
            ) : (
                <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                    {subtasks.map((subtask) => {
                        const check = subtask.completed && (
                            <Check className="size-3" strokeWidth={3} />
                        );

                        return (
                            <div
                                key={subtask.id}
                                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-500/[0.04] sm:px-6"
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
                                            className={`${checkboxClass(subtask.completed)} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/30 ${
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
                <div className="relative border-t border-slate-200/70 bg-slate-100/50 px-5 py-4 sm:px-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
                    <form action={createSubtask} className="flex gap-2.5">
                        <input
                            name="title"
                            type="text"
                            required
                            maxLength={200}
                            placeholder="Add a subtask..."
                            className={fieldClass}
                        />

                        <button type="submit" className={subtaskButton}>
                            <Plus className="size-4" />
                            Add
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
}