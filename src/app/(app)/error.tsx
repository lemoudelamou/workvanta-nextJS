"use client";

import { ErrorNotice } from "@/components/ui/ErrorNotice";

// Inside the app: the sidebar and header stay, only the page area shows this.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return <ErrorNotice error={error} retry={retry} />;
}
