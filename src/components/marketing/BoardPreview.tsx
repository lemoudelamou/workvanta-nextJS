import { Lock } from "lucide-react";

type PreviewCard = {
    title: string;
    labels?: { name: string; className: string }[];
    due?: string;
    person?: string;
    blocked?: boolean;
};

// A still picture of the board, built from the app's own colours, so the
// home page shows the product instead of describing it.
const COLUMNS: { name: string; dot: string; cards: PreviewCard[]; hideOnMobile?: boolean }[] = [
    {
        name: "To do",
        dot: "bg-status-todo",
        cards: [
            {
                title: "Send launch email to beta list",
                labels: [{ name: "Marketing", className: "bg-pink-500/10 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300" }],
                due: "Fri",
                person: "LM",
                blocked: true,
            },
            { title: "Write release notes", due: "Mon", person: "AK" },
        ],
    },
    {
        name: "In progress",
        dot: "bg-status-progress",
        cards: [
            {
                title: "QA checkout on mobile",
                labels: [{ name: "Bug", className: "bg-red-500/10 text-red-700 dark:bg-red-400/15 dark:text-red-300" }],
                due: "Thu",
                person: "SR",
            },
        ],
    },
    {
        name: "In review",
        dot: "bg-status-review",
        hideOnMobile: true,
        cards: [
            {
                title: "Finalize pricing page copy",
                labels: [{ name: "Design", className: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" }],
                due: "Today",
                person: "MD",
            },
        ],
    },
    {
        name: "Done",
        dot: "bg-status-done",
        hideOnMobile: true,
        cards: [
            { title: "Set up the beta workspace", person: "AK" },
            { title: "Pick the launch date", person: "LM" },
        ],
    },
];

export function BoardPreview() {
    return (
        <div
            aria-hidden="true"
            className="rounded-2xl border border-border bg-[#eef0f4] p-2 shadow-[0_30px_80px_-30px_rgba(23,26,33,0.45)] dark:border-white/10 dark:bg-[#1b1f27]"
        >
            <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
                <span className="size-2.5 rounded-full bg-[#d6d9e0] dark:bg-white/15" />
                <span className="size-2.5 rounded-full bg-[#d6d9e0] dark:bg-white/15" />
                <span className="size-2.5 rounded-full bg-[#d6d9e0] dark:bg-white/15" />
                <span className="ml-3 text-xs font-medium text-[#5e6573] dark:text-[#a3a9b6]">Product launch · Board</span>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {COLUMNS.map((column) => (
                    <div
                        key={column.name}
                        className={`rounded-xl bg-[#f5f6f8] p-2 dark:bg-[#232832] ${column.hideOnMobile ? "hidden lg:block" : ""}`}
                    >
                        <p className="flex items-center gap-2 px-1 pb-2 pt-1 text-xs font-semibold text-[#171a21] dark:text-white">
                            <span className={`size-2 rounded-full ${column.dot}`} />
                            {column.name}
                            <span className="font-normal text-[#5e6573] dark:text-[#a3a9b6]">{column.cards.length}</span>
                        </p>

                        <ul className="space-y-2">
                            {column.cards.map((card) => (
                                <li
                                    key={card.title}
                                    className="rounded-lg bg-white p-2.5 shadow-[0_1px_2px_rgba(23,26,33,0.08)] dark:bg-[#2c323d]"
                                >
                                    <p className="text-[13px] font-medium leading-snug text-[#171a21] dark:text-white">{card.title}</p>

                                    {card.labels && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {card.labels.map((label) => (
                                                <span
                                                    key={label.name}
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${label.className}`}
                                                >
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#5e6573] dark:text-[#a3a9b6]">
                                        {card.due && <span className="rounded bg-[#f1f2f5] px-1.5 py-0.5 dark:bg-white/10">{card.due}</span>}
                                        {card.blocked && (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/12 px-1.5 py-0.5 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                                                <Lock className="size-2.5" />
                                                Blocked
                                            </span>
                                        )}
                                        {card.person && (
                                            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-brand/15 text-[9px] font-semibold text-brand">
                                                {card.person}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
