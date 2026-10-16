import { MessageSquare, Paperclip, Pencil, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/members";
import { canEditTasks } from "@/lib/auth/task_permission";

import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { PageBody } from "@/components/ui/PageBody";
import { buttonStyles } from "@/app/style/button-style";

import { CommentForm } from "./components/comment-form";
import { CommentsSection } from "./components/comment-section";
import { SubtasksSection } from "./components/subtasks-section";
import { DeleteTaskConfirmation } from "./components/delete-task-button";
import { ActivitySection } from "./components/activity-section";
import { AttachmentUpload } from "./components/attachement-upload";
import { DeleteAttachmentButton } from "./components/delete-attachment-button";
import {createCommentAction, deleteCommentAction, updateCommentAction, updateTaskAction, deleteTaskAction, uploadAttachmentAction, deleteAttachmentAction } from "./task-actions";
import { fieldClass, NEUTRAL_DOT} from "@/app/style/ui-tokens";



const STATUSES: Record<string, { label: string; dot: string }> = {
    TODO: { label: "To do", dot: NEUTRAL_DOT },
    IN_PROGRESS: { label: "In progress", dot: "bg-blue-500" },
    IN_REVIEW: { label: "In review", dot: "bg-amber-500" },
    DONE: { label: "Done", dot: "bg-emerald-500" },
};

const PRIORITIES: Record<string, { label: string; dot: string }> = {
    URGENT: { label: "Urgent", dot: "bg-rose-500" },
    HIGH: { label: "High", dot: "bg-orange-500" },
    MEDIUM: { label: "Medium", dot: "bg-amber-400" },
    LOW: { label: "Low", dot: "bg-sky-400" },
};

const DATE = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const USER_SELECT = { id: true, name: true, email: true, image: true } as const;

function formatEnum(value: string) {
    const text = value.replaceAll("_", " ").toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function lookup(table: Record<string, { label: string; dot: string }>, key: string) {
    return table[key] ?? { label: formatEnum(key), dot: NEUTRAL_DOT };
}

function getInitials(name: string | null, email: string) {
    const text = name?.trim() || email;
    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return text.slice(0, 2).toUpperCase();
}

function Panel({
                   children,
                   className = "",
               }: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={`rounded-2xl border border-border bg-card shadow-sm ${className}`}>
            {children}
        </section>
    );
}

function SectionHeader({
                           icon,
                           title,
                           description,
                       }: {
    icon: ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-start gap-3">
      <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground [&>svg]:size-[18px]"
      >
        {icon}
      </span>
            <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        </div>
    );
}

function Pill({ dot, children }: { dot: string; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
            {children}
    </span>
    );
}

function Avatar({
                    name,
                    email,
                    image,
                }: {
    name: string | null;
    email: string;
    image: string | null;
}) {
    return (
        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
      {image ? (
          <Image src={image} alt="" fill className="object-cover" sizes="32px" />
      ) : (
          getInitials(name, email)
      )}
    </span>
    );
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="bg-card p-5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2 min-h-8 text-sm font-medium text-foreground">{children}</dd>
        </div>
    );
}

function Field({
                   id,
                   label,
                   children,
               }: {
    id: string;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            {children}
        </div>
    );
}

type TaskPageProps = {
    params: Promise<{ slug: string; projectId: string; taskId: string }>;
};

export default async function TaskPage({ params }: TaskPageProps) {
    const session = await getSession();
    if (!session?.user?.id) redirect("/signin");

    const userId = session.user.id;
    const { slug, projectId, taskId } = await params;

    const task = await prisma.task.findFirst({
        where: {
            id: taskId,
            projectId,
            project: {
                workspace: { is: { slug, members: { some: { userId } } } },
            },
        },
        include: {
            project: { include: { workspace: true } },
            creator: true,
            assignee: true,
            subtasks: { orderBy: { position: "asc" } },
            comments: {
                orderBy: { createdAt: "asc" },
                include: { author: { select: USER_SELECT } },
            },
            attachments: { orderBy: { createdAt: "desc" } },
            activities: {
                orderBy: { createdAt: "desc" },
                include: { user: { select: USER_SELECT } },
            },
        },
    });

    if (!task) notFound();

    const [access, members] = await Promise.all([
        requireProjectAccess(slug, projectId),
        prisma.workspaceMember.findMany({
            where: { workspaceId: task.project.workspaceId },
            orderBy: { user: { name: "asc" } },
            include: { user: { select: USER_SELECT } },
        }),
    ]);

    const canEdit = canEditTasks(access);
    const people = members.map((member) => member.user);

    const updateTask = updateTaskAction.bind(null, slug, projectId, taskId);
    const deleteTask = deleteTaskAction.bind(null, slug, projectId, taskId);
    const createComment = createCommentAction.bind(null, slug, projectId, taskId);
    const deleteComment = deleteCommentAction.bind(null, slug, projectId, taskId);
    const updateComment = updateCommentAction.bind(null, slug, projectId, taskId);
    const uploadAttachment = uploadAttachmentAction.bind(null, slug, projectId, taskId);
    const deleteAttachment = deleteAttachmentAction.bind(null, slug, projectId, taskId);

    const status = lookup(STATUSES, task.status);
    const priority = lookup(PRIORITIES, task.priority);

    const attachmentCount = task.attachments.length;
    const overdue = !!task.dueDate && task.status !== "DONE" && task.dueDate < new Date();

    return (
        <PageBody>
            <Breadcrumb
                items={[
                    { label: task.project.workspace.name, href: `/workspace/${slug}`, truncate: true },
                    {
                        label: access.project.name,
                        href: `/workspace/${slug}/project/${projectId}`,
                        truncate: true,
                    },
                    { label: task.title, truncate: true },
                ]}
            />

            <header>
                <div className="flex flex-wrap items-center gap-2">
                    <Pill dot={status.dot}>{status.label}</Pill>
                    <Pill dot={priority.dot}>{priority.label} priority</Pill>
                </div>

                <h1 className="mt-4 break-words text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {task.title}
                </h1>

                {task.description ? (
                    <p className="mt-3 max-w-3xl whitespace-pre-wrap text-base leading-7 text-muted-foreground">
                        {task.description}
                    </p>
                ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                        No description yet.{canEdit ? " Add one from the edit panel." : ""}
                    </p>
                )}
            </header>

            <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <MetaCell label="Assignee">
                    {task.assignee ? (
                        <span className="flex items-center gap-2.5">
              <Avatar
                  name={task.assignee.name}
                  email={task.assignee.email}
                  image={task.assignee.image}
              />
              <span className="truncate">{task.assignee.name ?? task.assignee.email}</span>
            </span>
                    ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                    )}
                </MetaCell>

                <MetaCell label="Due date">
                    {task.dueDate ? (
                        <span className={overdue ? "text-rose-600 dark:text-rose-400" : undefined}>
              {DATE.format(task.dueDate)}
                            {overdue ? " (overdue)" : ""}
            </span>
                    ) : (
                        <span className="text-muted-foreground">No due date</span>
                    )}
                </MetaCell>

                <MetaCell label="Created by">
          <span className="truncate">
            {task.creator ? (task.creator.name ?? task.creator.email) : "Unknown"}
          </span>
                </MetaCell>

                <MetaCell label="Created">{DATE.format(task.createdAt)}</MetaCell>
            </dl>

            <div
                className={`mt-8 grid gap-6 ${canEdit ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}
            >
                <div className="min-w-0 space-y-6">
                    <SubtasksSection
                        taskId={task.id}
                        subtasks={task.subtasks}
                        slug={slug}
                        projectId={projectId}
                    />

                    <Panel className="p-5 sm:p-6">
                        <SectionHeader
                            icon={<Paperclip />}
                            title="Attachments"
                            description={`${attachmentCount} ${attachmentCount === 1 ? "file" : "files"} attached`}
                        />

                        <div className="mt-5 space-y-3">
                            {attachmentCount === 0 ? (
                                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                                    <Paperclip
                                        className="mx-auto size-5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <p className="mt-2 text-sm text-muted-foreground">No attachments yet.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                                    {task.attachments.map((attachment) => (
                                        <li
                                            key={attachment.id}
                                            className="flex items-center justify-between gap-3 bg-card px-3.5 py-3 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                        >
                          <Paperclip className="size-4" />
                        </span>

                                                <div className="min-w-0">
                                                    <a
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block truncate text-sm font-medium text-foreground hover:underline"
                                                    >
                                                        {attachment.filename}
                                                    </a>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        Added {DATE.format(attachment.createdAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            {canEdit && (
                                                <DeleteAttachmentButton
                                                    action={deleteAttachment.bind(null, attachment.id)}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {canEdit && <AttachmentUpload action={uploadAttachment} />}
                        </div>
                    </Panel>

                    <div className="relative z-20">
                        <CommentsSection
                            form={<CommentForm action={createComment} members={people} />}
                            comments={task.comments}
                            currentUserId={userId}
                            deleteComment={deleteComment}
                            updateComment={updateComment}
                            members={people}
                        />
                    </div>

                    <div className="relative z-0">
                        <ActivitySection activities={task.activities} />
                    </div>
                </div>

                {canEdit && (
                    <aside className="relative z-10">
                        <Panel className="p-5 sm:p-6 lg:sticky lg:top-6">
                            <SectionHeader
                                icon={<Pencil />}
                                title="Edit task"
                                description="Changes apply to everyone"
                            />

                            <form action={updateTask} className="mt-6 space-y-5">
                                <Field id="task-title" label="Title">
                                    <input
                                        id="task-title"
                                        name="title"
                                        defaultValue={task.title}
                                        className={fieldClass}
                                        required
                                    />
                                </Field>

                                <Field id="task-description" label="Description">
                  <textarea
                      id="task-description"
                      name="description"
                      defaultValue={task.description ?? ""}
                      rows={5}
                      className={`${fieldClass} resize-y`}
                      placeholder="Add a description…"
                  />
                                </Field>

                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                                    <Field id="task-status" label="Status">
                                        <select
                                            id="task-status"
                                            name="status"
                                            defaultValue={task.status}
                                            className={fieldClass}
                                        >
                                            {Object.entries(STATUSES).map(([value, { label }]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field id="task-priority" label="Priority">
                                        <select
                                            id="task-priority"
                                            name="priority"
                                            defaultValue={task.priority}
                                            className={fieldClass}
                                        >
                                            {Object.entries(PRIORITIES).map(([value, { label }]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>

                                <Field id="task-assignee" label="Assignee">
                                    <select
                                        id="task-assignee"
                                        name="assigneeId"
                                        defaultValue={task.assigneeId ?? ""}
                                        className={fieldClass}
                                    >
                                        <option value="">Unassigned</option>
                                        {people.map((person) => (
                                            <option key={person.id} value={person.id}>
                                                {person.name ?? person.email}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field id="task-due" label="Due date">
                                    <input
                                        id="task-due"
                                        type="date"
                                        name="dueDate"
                                        defaultValue={
                                            task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""
                                        }
                                        className={fieldClass}
                                    />
                                </Field>

                                <button type="submit" className={`${buttonStyles()} w-full justify-center`}>
                                    Save changes
                                </button>
                            </form>
                        </Panel>
                    </aside>
                )}
            </div>

            {canEdit && (
                <section
                    aria-labelledby="danger-zone"
                    className="mt-14 flex flex-col gap-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-start gap-3">
            <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"
            >
              <TriangleAlert className="size-[18px]" />
            </span>
                        <div>
                            <h2 id="danger-zone" className="text-sm font-semibold text-foreground">
                                Delete this task
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                This permanently removes the task and can&apos;t be undone.
                            </p>
                        </div>
                    </div>

                    <DeleteTaskConfirmation action={deleteTask} />
                </section>
            )}
        </PageBody>
    );
}