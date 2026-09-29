import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-slate-800">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
