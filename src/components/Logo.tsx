import { ListChecks } from "lucide-react";

import { cn } from "@/lib/cn";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/25">
        <ListChecks className="size-5" />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-slate-900">Дела в порядке</span>
      )}
    </span>
  );
}
