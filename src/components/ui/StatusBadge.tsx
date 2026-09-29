import type { TaskStatus } from "@/types";
import { cn } from "@/lib/cn";
import { formatRelativeDeadline } from "@/lib/date";

const STYLES: Record<TaskStatus, { dot: string; chip: string; label: string }> = {
  overdue: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "Просрочено",
  },
  urgent: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Сегодня",
  },
  soon: {
    dot: "bg-orange-400",
    chip: "bg-orange-50 text-orange-700 ring-orange-200",
    label: "Скоро",
  },
  planned: {
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600 ring-slate-200",
    label: "Запланировано",
  },
  done: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Выполнено",
  },
};

/** Короткие подписи статусов. Нужны, чтобы не дублировать текст в TaskItem. */
export const STATUS_LABELS = Object.fromEntries(
  (Object.keys(STYLES) as TaskStatus[]).map((status) => [status, STYLES[status].label]),
) as Record<TaskStatus, string>;

/**
 * Статусы, для которых относительная подпись полезнее общего бейджа:
 * «Просрочено на 3 дня» и «Завтра» уточняют то, что бейдж передаёт обобщённо.
 * Для «Запланировано» и «Выполнено» подпись не нужна — она была бы шумом.
 */
const RELATIVE_STATUSES = new Set<TaskStatus>(["overdue", "urgent", "soon"]);

const PILL_TONES: Partial<Record<TaskStatus, string>> = {
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  urgent: "bg-amber-50 text-amber-700 ring-amber-200",
  soon: "bg-orange-50 text-orange-700 ring-orange-200",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const style = STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

/**
 * Относительная подпись дедлайна: «Просрочено на 3 дня», «Сегодня», «Завтра», «Через 2 дня».
 *
 * Возвращает `null`, когда подпись не добавляет информации: у срочной задачи «Сегодня»
 * дословно совпадает с подписью бейджа, а у далёких дедлайнов хватает «Запланировано».
 * Раньше эта логика жила в TaskItem и Dashboard двумя копиями, и в Dashboard её
 * забыли синхронизировать — поэтому правило держим здесь, в одном месте.
 */
export function RelativeDeadline({
  deadline,
  status,
  className,
}: {
  deadline: string | null;
  status: TaskStatus;
  className?: string;
}) {
  const text = formatRelativeDeadline(deadline);
  const tone = PILL_TONES[status];

  if (!RELATIVE_STATUSES.has(status) || !tone || text === STATUS_LABELS[status]) return null;

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {text}
    </span>
  );
}
