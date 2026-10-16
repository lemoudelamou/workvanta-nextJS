"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { iconTile, uploadButton } from "@/app/style/ui-tokens";

type AttachmentUploadProps = {
    action: (formData: FormData) => void | Promise<void>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function AttachmentUpload({ action }: AttachmentUploadProps) {
    const formRef = useRef<HTMLFormElement>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (file && file.size > MAX_FILE_SIZE) {
            setError("File size must be less than 10 MB.");
            event.target.value = "";
            return;
        }

        setError(null);
    }

    async function handleSubmit(formData: FormData) {
        setError(null);
        setIsUploading(true);

        try {
            await action(formData);
            formRef.current?.reset();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload file.");
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-3">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 transition-colors duration-200 hover:border-slate-400 hover:bg-white/80 dark:border-white/[0.12] dark:bg-white/[0.02] dark:hover:border-white/[0.2] dark:hover:bg-white/[0.04]">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <label
                            htmlFor="attachment"
                            className="block text-sm font-semibold tracking-tight text-slate-950 dark:text-white"
                        >
                            Upload file
                        </label>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Images, PDF, ZIP, and text files are supported.
                        </p>
                    </div>

                    <div className={`${iconTile} size-9 rounded-xl`}>
                        <Upload className="size-4" />
                    </div>
                </div>

                <input
                    id="attachment"
                    name="file"
                    type="file"
                    required
                    disabled={isUploading}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/zip,.zip"
                    className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-xs text-slate-500 outline-none transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/15 disabled:cursor-not-allowed disabled:opacity-50 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200/70 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-white/[0.16] dark:focus:border-white/25 dark:focus:ring-white/10 dark:file:bg-white/[0.08] dark:file:text-slate-200"
                />

                <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                    Maximum file size: 10 MB
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300"
                >
                    {error}
                </div>
            )}

            <button type="submit" disabled={isUploading} className={uploadButton}>
                {isUploading ? (
                    <>
                        <Loader2 className="size-4 motion-safe:animate-spin" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <Upload className="size-4" />
                        Upload file
                    </>
                )}
            </button>
        </form>
    );
}