// components/tasks/task-form-fields.tsx
import { Field, Input, Select, Textarea } from "@/components/ui/FormField";
import { PRIORITY_META, TASK_COLUMNS, type TaskStatus } from "@/lib/task-status";



export type TaskFormMember = {
    id: string;
    name: string | null;
    email: string;
};

export function TaskFormFields({
                                   members,
                                   defaultStatus = "TODO",
                                   collapseDescription = false,
                               }: {
    members: TaskFormMember[];
    defaultStatus?: TaskStatus;
    collapseDescription?: boolean;
}) {
    const description = (
        <Textarea
            name="description"
            rows={collapseDescription ? 3 : 5}
            maxLength={2000}
            placeholder="What needs to be done? Add any context or expected outcome."
        />
    );

    return (
        <>
            <Field label="Title">
                <Input
                    required
                    autoFocus
                    name="title"
                    maxLength={200}
                    placeholder="e.g. Design the landing page"
                />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Status">
                    <Select name="status" defaultValue={defaultStatus}>
                        {TASK_COLUMNS.map((column) => (
                            <option key={column.status} value={column.status}>
                                {column.label}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Priority">
                    <Select name="priority" defaultValue="MEDIUM">
                        {Object.entries(PRIORITY_META).map(([value, meta]) => (
                            <option key={value} value={value}>
                                {meta.label}
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Assignee" optional>
                    <Select name="assigneeId" defaultValue="">
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                            <option key={member.id} value={member.id}>
                                {member.name ?? member.email}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Due date" optional>
                    <Input type="date" name="dueDate" className="dark:[color-scheme:dark]" />
                </Field>
            </div>

            {collapseDescription ? (
                <details className="group">
                    <summary className="cursor-pointer select-none text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                        Add description
                    </summary>
                    <div className="mt-3">{description}</div>
                </details>
            ) : (
                <Field label="Description" optional>
                    {description}
                </Field>
            )}
        </>
    );
}