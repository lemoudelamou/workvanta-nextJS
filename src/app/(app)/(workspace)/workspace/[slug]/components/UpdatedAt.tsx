import { Clock } from "lucide-react"
import {timeAgo} from "@/helpers/timeAgo";


export function UpdatedAt({ date }: { date: Date }) {
    return (
        <time
            dateTime={date.toISOString()}
            title={date.toLocaleString("en-US")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
            <Clock className="size-3.5" aria-hidden="true" />
            Updated {timeAgo(date)}
        </time>
    );
}