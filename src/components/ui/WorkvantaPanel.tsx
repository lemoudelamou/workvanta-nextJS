import WorkvantaBrand from "@/components/ui/WorkvantaBrand";

// A static preview of the project status bar, so the sign-in page shows
// the product rather than describing it.
const PREVIEW = [
    { label: "To do", count: 6, className: "bg-status-todo" },
    { label: "In progress", count: 5, className: "bg-status-progress" },
    { label: "In review", count: 3, className: "bg-status-review" },
    { label: "Done", count: 14, className: "bg-status-done" },
];

const PREVIEW_TASKS = [
    { title: "Finalize pricing page copy", status: "In review", dot: "bg-status-review", due: "Today" },
    { title: "QA checkout on mobile", status: "In progress", dot: "bg-status-progress", due: "Thu" },
    { title: "Send launch email to beta list", status: "To do", dot: "bg-status-todo", due: "Fri" },
];

export default function LoginBrandPanel() {
    const total = PREVIEW.reduce((sum, item) => sum + item.count, 0);
    const done = PREVIEW.find((item) => item.label === "Done")?.count ?? 0;

    return (
        <section className="relative hidden overflow-hidden bg-[#171a21] lg:flex">
            <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
                <WorkvantaBrand light />

                <div className="max-w-xl">
                    <h1 className="text-[2.75rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white xl:text-5xl">
                        Every project, every task, one clear view of where things stand.
                    </h1>

                    <p className="mt-5 max-w-md text-base leading-7 text-[#a3a9b6]">
                        Plan work on a board or a list, assign it, and see
                        what&apos;s moving and what&apos;s late across your team.
                    </p>

                    <div
                        aria-hidden="true"
                        className="mt-12 rounded-xl bg-[#f5f6f8] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
                    >
                        <div className="rounded-lg bg-white px-5 py-4">
                            <div className="flex items-baseline justify-between">
                                <p className="text-sm font-semibold text-[#171a21]">Product launch</p>
                                <p className="text-xs text-[#5e6573]">
                                    <span className="text-sm font-semibold text-[#171a21]">
                                        {Math.round((done / total) * 100)}%
                                    </span>{" "}
                                    done
                                </p>
                            </div>

                            <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                                {PREVIEW.map((item) => (
                                    <div
                                        key={item.label}
                                        className={`${item.className} first:rounded-l-full last:rounded-r-full`}
                                        style={{ flexGrow: item.count }}
                                    />
                                ))}
                            </div>

                            <ul className="mt-4 divide-y divide-[#e3e6eb] border-t border-[#e3e6eb]">
                                {PREVIEW_TASKS.map((task) => (
                                    <li
                                        key={task.title}
                                        className="flex items-center gap-3 py-2.5 text-[13px]"
                                    >
                                        <span className={`size-2 shrink-0 rounded-full ${task.dot}`} />
                                        <span className="flex-1 truncate font-medium text-[#171a21]">
                                            {task.title}
                                        </span>
                                        <span className="w-20 text-xs text-[#5e6573]">{task.status}</span>
                                        <span className="w-10 text-right text-xs tabular-nums text-[#5e6573]">
                                            {task.due}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-[#6b7280]">
                    © {new Date().getFullYear()} Workvanta
                </p>
            </div>
        </section>
    );
}
