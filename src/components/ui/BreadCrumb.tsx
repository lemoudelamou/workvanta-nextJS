import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type BreadcrumbItem = {
    label: ReactNode;
    href?: string;
    truncate?: boolean;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <span key={index} className="flex items-center gap-2">
                        {index > 0 && (
                            <ChevronRight
                                className="size-3.5"
                                aria-hidden="true"
                            />
                        )}

                        {item.href && !isLast ? (
                            <Link
                                href={item.href}
                                className={`transition-colors hover:text-slate-950 dark:hover:text-white ${item.truncate
                                        ? "max-w-[220px] truncate"
                                        : ""
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                aria-current={isLast ? "page" : undefined}
                                className={`font-medium text-slate-700 dark:text-slate-200 ${item.truncate
                                        ? "max-w-[220px] truncate"
                                        : ""
                                    }`}
                            >
                                {item.label}
                            </span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}