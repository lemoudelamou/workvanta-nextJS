"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { uploadButton } from "@/app/style/ui-tokens";

type AttachmentUploadProps = {
    action: (formData: FormData) => void | Promise<void>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/zip,.zip";

/** "Upload file" opens the picker; choosing a file uploads it straight away. */
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
        <form ref={formRef} action={handleSubmit} className="flex shrink-0 flex-col items-end gap-1">
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
                title="Images, PDF, ZIP or text files up to 10 MB"
                className={`${uploadButton} h-8 px-3 text-[13px]`}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <Upload className="size-3.5" aria-hidden="true" />
                        Upload file
                    </>
                )}
            </button>

            {error && (
                <p role="alert" className="max-w-56 text-right text-xs font-medium text-danger">
                    {error}
                </p>
            )}
        </form>
    );
}
