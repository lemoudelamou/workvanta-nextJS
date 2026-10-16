import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { buttonStyles } from "@/app/style/button-style";

export function AccessDeniedNotice({
                                       message,
                                       workspaceSlug,
                                   }: {
    message: string;
    workspaceSlug: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f8f8fa] px-4 text-slate-950 dark:bg-slate-950 dark:text-white">
            <Card as="div" className="max-w-sm p-8 text-center">
                <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                    <ShieldAlert className="size-5" />
                </div>
                <h1 className="text-lg font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                <Link
                    href={`/workspace/${workspaceSlug}`}
                    className={buttonStyles({ className: "mt-5" })}
                >
                    Back to workspace
                </Link>
            </Card>
        </main>
    );
}