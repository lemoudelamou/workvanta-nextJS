import { ChevronDown, FileText, Pencil } from "lucide-react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
    listProjectAudience,
    requireProjectAccess,
    type ProjectAccessResult,
} from "@/lib/auth/members";
import { canProject } from "@/lib/auth/permissions";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { attachmentHref } from "@/lib/storage/attachments";
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
import { personColor } from "@/lib/ui/person-color";
import { projectHex } from "@/lib/navigation/project-color";



const STATUSES: Record<string, { label: string; dot: string }> = {
    TODO: { label: "To do", dot: NEUTRAL_DOT },
    IN_PROGRESS: { label: "In progress", dot: "bg-blue-500" },
    IN_REVIEW: { label: "In review", dot: "bg-amber-500" },
    DONE: { label: "Done", dot: "bg-emerald-500" },
};

const PRIORITIES: Record<string, { label: string; dot: string }> = {
    URGENT: { label: "Urgent", dot: "bg-danger" },
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

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)] ${className}`}>
            {children}
        </section>
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

function Avatar({ name, email, image }: { name: string | null; email: string; image: string | null }) {
    return (
        <span
            className={`relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold ${personColor(email)}`}
        >
            {image ? <Image src={image} alt="" fill className="object-cover" sizes="24px" /> : getInitials(name, email)}
        </span>
    );
}

/** One label/value row in the details sidebar. */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 py-2.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex min-h-6 min-w-0 items-center text-sm font-medium text-foreground">{children}</dd>
        </div>
    );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-[13px] font-medium text-foreground">
                {label}
            </label>
            {children}
        </div>
    );
}

type TaskPageProps = {
    params: Promise<{ slug: string; projectId: string; taskId: string }>;
    searchParams?: Promise<{ comments?: string; activity?: string }>;
};

/** Newest comments / activity entries shown before "show all". */
const COMMENT_PAGE_SIZE = 50;
const ACTIVITY_PAGE_SIZE = 20;

export default async function TaskPage({ params, searchParams }: TaskPageProps) {
    const session = await getSession();
    if (!session?.user?.id) redirect("/signin");

    const userId = session.user.id;
    const { slug, projectId, taskId } = await params;
    const query = (await searchParams) ?? {};
    const showAllComments = query.comments === "all";
    const showAllActivity = query.activity === "all";
    const taskHref = `/workspace/${slug}/project/${projectId}/tasks/${taskId}`;
    const withParam = (key: string) => {
        const next = new URLSearchParams();
        if (showAllComments || key === "comments") next.set("comments", "all");
        if (showAllActivity || key === "activity") next.set("activity", "all");
        return `${taskHref}?${next.toString()}`;
    };

    // Check project access first so private projects never load task data
    // for people who can't open them.
    let access: ProjectAccessResult;

    try {
        access = await requireProjectAccess(slug, projectId);
    } catch (error) {
        const digest = (error as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        // The project itself is gone: send people to the project URL so they
        // get the project's not-found page, not "this task was deleted".
        if (error instanceof Error && error.message === "Project not found.") {
            redirect(`/workspace/${slug}/project/${projectId}`);
        }
        return (
            <AccessDeniedNotice
                workspaceSlug={slug}
                message={
                    error instanceof Error
                        ? error.message
                        : "Something went wrong loading this task."
                }
            />
        );
    }

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
            // Newest first so "take" keeps the latest; flipped back below.
            comments: {
                orderBy: { createdAt: "desc" },
                ...(showAllComments ? {} : { take: COMMENT_PAGE_SIZE }),
                include: { author: { select: USER_SELECT } },
            },
            attachments: { orderBy: { createdAt: "desc" } },
            activities: {
                orderBy: { createdAt: "desc" },
                ...(showAllActivity ? {} : { take: ACTIVITY_PAGE_SIZE }),
                include: { user: { select: USER_SELECT } },
            },
            _count: { select: { comments: true, activities: true } },
        },
    });

    if (!task) notFound();

    // Assignee and @mention suggestions only include people who can open
    // this project.
    const people = await listProjectAudience(access.project);

    const canEdit = canEditTasks(access);
    const canModerate = canProject(access.effectiveRole, "comment.moderate");

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

    const field = `${fieldClass} py-2`;

    return (
        <PageBody glow={projectHex(projectId)}>
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

            {/* Phones: header, details, the work, then delete. Wide screens: details in a sticky column
                (the aside is display:contents below xl so its cards can be ordered in the grid). */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:grid-rows-[auto_1fr] xl:gap-x-10">
                <header className="min-w-0 xl:col-start-1 xl:row-start-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Pill dot={status.dot}>{status.label}</Pill>
                        <Pill dot={priority.dot}>{priority.label} priority</Pill>
                    </div>

                    <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {task.title}
                    </h1>

                    {task.description ? (
                        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-muted-foreground">
                            {task.description}
                        </p>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                            No description yet.{canEdit ? " Add one from the edit panel." : ""}
                        </p>
                    )}
                </header>

                <aside
                    aria-label="Task details"
                    className="contents xl:sticky xl:top-6 xl:z-10 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:block xl:min-w-0 xl:space-y-4 xl:self-start"
                >
                    <Card>
                        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Details</h2>
                        <dl className="divide-y divide-border px-4">
                            <DetailRow label="Assignee">
                                {task.assignee ? (
                                    <span className="flex min-w-0 items-center gap-2">
                                        <Avatar
                                            name={task.assignee.name}
                                            email={task.assignee.email}
                                            image={task.assignee.image}
                                        />
                                        <span className="truncate">{task.assignee.name ?? task.assignee.email}</span>
                                    </span>
                                ) : (
                                    <span className="font-normal text-muted-foreground">Unassigned</span>
                                )}
                            </DetailRow>

                            <DetailRow label="Due date">
                                {task.dueDate ? (
                                    <span className={overdue ? "text-danger" : undefined}>
                                        {DATE.format(task.dueDate)}
                                        {overdue ? " (overdue)" : ""}
                                    </span>
                                ) : (
                                    <span className="font-normal text-muted-foreground">No due date</span>
                                )}
                            </DetailRow>

                            <DetailRow label="Created by">
                                <span className="truncate">
                                    {task.creator ? (task.creator.name ?? task.creator.email) : "Unknown"}
                                </span>
                            </DetailRow>

                            <DetailRow label="Created">{DATE.format(task.createdAt)}</DetailRow>
                        </dl>

                        {canEdit && (
                            <details className="group border-t border-border">
                                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                                    <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                                    <span className="flex-1">Edit task</span>
                                    <ChevronDown
                                        className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                                        aria-hidden="true"
                                    />
                                </summary>

                                <form action={updateTask} className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                                    <Field id="task-title" label="Title">
                                        <input
                                            id="task-title"
                                            name="title"
                                            defaultValue={task.title}
                                            className={field}
                                            required
                                        />
                                    </Field>

                                    <Field id="task-description" label="Description">
                                        <textarea
                                            id="task-description"
                                            name="description"
                                            defaultValue={task.description ?? ""}
                                            rows={4}
                                            className={`${field} resize-y`}
                                            placeholder="Add a description…"
                                        />
                                    </Field>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Field id="task-status" label="Status">
                                            <select id="task-status" name="status" defaultValue={task.status} className={field}>
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
                                                className={field}
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
                                            className={field}
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
                                            defaultValue={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""}
                                            className={field}
                                        />
                                    </Field>

                                    <button type="submit" className={`${buttonStyles()} w-full justify-center`}>
                                        Save changes
                                    </button>
                                </form>
                            </details>
                        )}
                    </Card>

                    {canEdit && (
                        <section
                            aria-labelledby="danger-zone"
                            className="order-last flex items-center justify-between gap-4 rounded-xl border border-danger/20 px-4 py-3 xl:order-none"
                        >
                            <div className="min-w-0">
                                <h2 id="danger-zone" className="text-sm font-medium text-foreground">
                                    Delete this task
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">This can&apos;t be undone.</p>
                            </div>
                            <DeleteTaskConfirmation action={deleteTask} />
                        </section>
                    )}
                </aside>

                <div className="min-w-0 space-y-6 xl:col-start-1 xl:row-start-2">
                    <SubtasksSection taskId={task.id} subtasks={task.subtasks} slug={slug} projectId={projectId} />

                    <Card>
                        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                                <h2 className="text-sm font-semibold text-foreground">Attachments</h2>
                                <span className="whitespace-nowrap text-xs text-muted-foreground">
                                    {attachmentCount} {attachmentCount === 1 ? "file" : "files"} attached
                                </span>
                            </div>
                            {canEdit && <AttachmentUpload action={uploadAttachment} />}
                        </div>

                        {attachmentCount === 0 ? (
                            <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-5">
                                No attachments yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border border-t border-border">
                                {task.attachments.map((attachment) => (
                                    <li
                                        key={attachment.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40 sm:px-5"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                aria-hidden="true"
                                                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                                            >
                                                <FileText className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <a
                                                    href={attachmentHref(attachment.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block truncate text-sm font-medium text-foreground hover:underline"
                                                >
                                                    {attachment.filename}
                                                </a>
                                                <p className="text-xs text-muted-foreground">
                                                    Added {DATE.format(attachment.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {canEdit && (
                                            <DeleteAttachmentButton
                                                filename={attachment.filename}
                                                action={deleteAttachment.bind(null, attachment.id)}
                                            />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Above Activity so the @mention list can overlap it. */}
                    <div className="relative z-20">
                        <CommentsSection
                            form={<CommentForm action={createComment} members={people} />}
                            comments={[...task.comments].reverse()}
                            totalCount={task._count.comments}
                            showAllHref={withParam("comments")}
                            currentUserId={userId}
                            deleteComment={deleteComment}
                            updateComment={updateComment}
                            members={people}
                            canModerate={canModerate}
                        />
                    </div>

                    <div className="relative z-0">
                        <ActivitySection
                            activities={task.activities}
                            totalCount={task._count.activities}
                            showAllHref={withParam("activity")}
                        />
                    </div>
                </div>
            </div>
        </PageBody>
    );
}
