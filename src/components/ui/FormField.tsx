import { cn } from "@/lib/utils";

const control =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-slate-950";

export function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {label}
                {optional && <span className="ml-1 font-normal text-slate-400">Optional</span>}
            </span>
            {children}
        </label>
    );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
    return <input className={cn(control, "h-11 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return <textarea className={cn(control, "resize-none p-3", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
    return (
        <select
            className={cn(control, "h-11 px-3 dark:[color-scheme:dark]", className)}
            {...props}
        />
    );
}