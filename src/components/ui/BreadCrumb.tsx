import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type BreadcrumbItem = {
    label: ReactNode;
    href?: string;
    truncate?: boolean;
};

/**
 * Full trail from the small breakpoint up. On phones a long trail wraps
 * badly, and the page title already names the current page, so it collapses
 * to a single "back to parent" link.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    const parent = [...items.slice(0, -1)].reverse().find((item) => item.href);

    return (
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground sm:mb-8">
            {parent?.href && (
                <Link
                    href={parent.href}
                    className="inline-flex max-w-full items-center gap-1.5 transition-colors hover:text-foreground sm:hidden"
                >
                    <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{parent.label}</span>
                </Link>
            )}

            <ol className={`${parent?.href ? "hidden sm:flex" : "flex"} flex-wrap items-center gap-2`}>
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const truncate = item.truncate ? "max-w-[220px] truncate" : "";

                    return (
                        <li key={index} className="flex min-w-0 items-center gap-2">
                            {index > 0 && (
                                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                            )}

                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className={`transition-colors hover:text-foreground ${truncate}`}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    aria-current={isLast ? "page" : undefined}
                                    className={`font-medium text-foreground ${truncate}`}
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
