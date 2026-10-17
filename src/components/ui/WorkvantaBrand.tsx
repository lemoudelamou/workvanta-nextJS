import Link from "next/link";

interface WorkvantaBrandProps {
  light?: boolean;
  className?: string;
}

export default function WorkvantaBrand({
  light = false,
  className = "",
}: WorkvantaBrandProps) {
  return (
    <Link
      href="/dashboard"
      className={`flex items-center gap-3 ${className}`}
      aria-label="Workvanta home"
    >
      <div
        className={`flex size-9 items-center justify-center rounded-lg ${light
            ? "bg-white text-[#101828]"
            : "bg-foreground text-background"
          }`}
      >
        <span className="text-base font-bold">W</span>
      </div>

      <span
        className={`text-lg font-semibold tracking-[-0.01em] ${light ? "text-white" : "text-foreground"
          }`}
      >
        workvanta
      </span>
    </Link>
  );
}