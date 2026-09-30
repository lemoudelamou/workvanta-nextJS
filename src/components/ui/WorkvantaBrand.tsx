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
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${light
            ? "bg-white text-[#101828]"
            : "bg-[#101828] text-white dark:bg-white dark:text-[#101828]"
          }`}
      >
        <span className="text-lg font-bold">W</span>
      </div>

      <span
        className={`text-xl font-semibold tracking-tight ${light ? "text-white" : "text-[#101828] dark:text-white"
          }`}
      >
        workvanta
      </span>
    </Link>
  );
}