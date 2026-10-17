import { FileArchive, FileImage, FileText, File as FileIcon } from "lucide-react";

import { attachmentHref } from "@/lib/storage/attachments";
import { AttachmentUpload } from "./attachement-upload";
import { DeleteAttachmentButton } from "./delete-attachment-button";
import { formatBytes } from "./task-meta";

type Attachment = {
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    createdAt: Date;
};

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function fileKind(mimeType: string, filename: string) {
    const ext = filename.split(".").pop()?.toUpperCase() ?? "";
    if (mimeType.startsWith("image/")) return { icon: FileImage, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-300", label: ext || "Image" };
    if (mimeType === "application/pdf") return { icon: FileText, tint: "bg-rose-500/10 text-rose-600 dark:text-rose-300", label: "PDF" };
    if (mimeType.includes("zip")) return { icon: FileArchive, tint: "bg-amber-500/12 text-amber-700 dark:text-amber-300", label: "ZIP" };
    if (mimeType.startsWith("text/")) return { icon: FileText, tint: "bg-sky-500/10 text-sky-600 dark:text-sky-300", label: ext || "Text" };
    return { icon: FileIcon, tint: "bg-muted text-muted-foreground", label: ext || "File" };
}

export function AttachmentsSection({
    attachments,
    canEdit,
    upload,
    remove,
}: {
    attachments: Attachment[];
    canEdit: boolean;
    upload: (formData: FormData) => Promise<void>;
    remove: (attachmentId: string) => Promise<void>;
}) {
    const count = attachments.length;
    if (!canEdit && count === 0) return null;

    return (
        <section aria-labelledby="attachments-heading">
            <h2 id="attachments-heading" className="flex items-baseline gap-2 text-[15px] font-semibold text-foreground">
                Attachments
                {count > 0 && (
                    <span className="text-[13px] font-normal text-muted-foreground">
                        {count} {count === 1 ? "file" : "files"}
                    </span>
                )}
            </h2>

            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {attachments.map((attachment) => {
                    const kind = fileKind(attachment.mimeType, attachment.filename);
                    const Icon = kind.icon;
                    return (
                        <li
                            key={attachment.id}
                            className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 pr-10 shadow-[0_1px_2px_rgba(23,26,33,0.04)] transition-colors hover:border-foreground/20"
                        >
                            <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${kind.tint}`}>
                                <Icon className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <a
                                    href={attachmentHref(attachment.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block truncate text-[13px] font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-brand"
                                >
                                    {attachment.filename}
                                </a>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {kind.label}, {formatBytes(attachment.size)}, added {DATE.format(attachment.createdAt)}
                                </p>
                            </div>
                            {canEdit && (
                                <div className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                                    <DeleteAttachmentButton
                                        filename={attachment.filename}
                                        action={remove.bind(null, attachment.id)}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}

                {canEdit && (
                    <li>
                        <AttachmentUpload action={upload} />
                    </li>
                )}
            </ul>
        </section>
    );
}
