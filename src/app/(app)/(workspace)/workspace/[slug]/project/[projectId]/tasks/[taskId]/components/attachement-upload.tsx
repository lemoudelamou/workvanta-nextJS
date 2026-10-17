"use client";

import { Loader2, Plus } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

type AttachmentUploadProps = {
    action: (formData: FormData) => void | Promise<void>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/zip,.zip";

/** A dashed "Add file" tile: choosing a file uploads it straight away. */
export function AttachmentUpload({ action }: AttachmentUploadProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            setError("That file is over 10 MB. Choose a smaller one.");
            event.target.value = "";
            return;
        }

        setError(null);
        formRef.current?.requestSubmit();
    }

    async function handleSubmit(formData: FormData) {
        setError(null);
        setIsUploading(true);

        try {
            await action(formData);
            formRef.current?.reset();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't upload the file. Please try again.");
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <form ref={formRef} action={handleSubmit} className="h-full">
            <input
                ref={inputRef}
                id="attachment"
                name="file"
                type="file"
                required
                disabled={isUploading}
                onChange={handleFileChange}
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
            />

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                title="Images, PDF, ZIP or text files"
                className="flex h-full min-h-[62px] w-full items-center gap-3 rounded-xl border border-dashed border-foreground/20 p-2.5 text-left outline-none transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait dark:hover:bg-brand/10"
            >
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {isUploading ? <Loader2 className="size-5 motion-safe:animate-spin" /> : <Plus className="size-5" />}
                </span>
                <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">
                        {isUploading ? "Uploading..." : "Add file"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">Up to 10 MB</span>
                </span>
            </button>

            {error && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                    {error}
                </p>
            )}
        </form>
    );
}
