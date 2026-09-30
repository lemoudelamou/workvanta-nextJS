import { Card } from "@/components/ui/Card"

export function StatCard({
    icon,
    label,
    value,
    detail,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    detail?: string;
}) {
    return (
        <Card as="article" className="p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-2 text-3xl font-bold">{value}</p>
                    {detail && (
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                    )}
                </div>
                <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200 [&>svg]:size-5">
                    {icon}
                </div>
            </div>
        </Card>
    );
}