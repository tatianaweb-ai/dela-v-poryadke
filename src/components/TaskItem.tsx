"use client";

import { CalendarDays, Check, FolderKanban, Pencil, Trash2 } from "lucide-react";
import { memo } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge, RelativeDeadline } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/context/AppStore";
import { cn } from "@/lib/cn";
import { formatDeadline, getTaskStatus } from "@/lib/date";
import type { Task } from "@/types";
import { useState } from "react";

export interface TaskItemProps {
  task: Task;
  projectName: string;
  onEdit: (task: Task) => void;
  showProject?: boolean;
  compact?: boolean;
}

export const TaskItem = memo(function TaskItem({
  task,
  projectName,
  onEdit,
  showProject = true,
  compact = false,
}: TaskItemProps) {
  const { toggleTask, deleteTask } = useAppStore();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status = getTaskStatus(task);

  const handleToggle = () => {
    toggleTask(task.id);
    toast.success(task.done ? "Задача возвращена в работу" : "Задача выполнена");
  };

  const handleDelete = () => {
    deleteTask(task.id);
    toast.success("Задача удалена");
  };

  return (
    <>
      <li
        className={cn(
          "group flex items-start gap-3 rounded-xl border bg-white p-3 transition-all duration-150 sm:gap-3.5 sm:p-3.5",
          task.done
            ? "border-slate-200/80 opacity-70 hover:opacity-100"
            : status === "overdue"
              ? "border-rose-200 hover:border-rose-300 hover:shadow-sm"
              : status === "urgent"
                ? "border-amber-200 hover:border-amber-300 hover:shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          onClick={handleToggle}
          title={task.done ? "Вернуть в работу" : "Отметить выполненной"}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150 active:scale-90",
            task.done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-indigo-500 hover:bg-indigo-50",
          )}
        >
          <Check className="size-3.5" strokeWidth={3.5} />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-snug break-words sm:text-[0.9375rem]",
              task.done && "text-slate-400 line-through",
            )}
          >
            {task.title}
          </p>

          <div
            className={cn(
              "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
              compact && "mt-1",
            )}
          >
            {showProject && (
              <span className="inline-flex min-w-0 items-center gap-1 text-slate-500">
                <FolderKanban className="size-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{projectName || "Без проекта"}</span>
              </span>
            )}

            <span
              className={cn(
                "inline-flex flex-wrap items-center gap-1",
                status === "overdue" && "font-medium text-rose-600",
              )}
            >
              <CalendarDays
                className={cn(
                  "size-3.5 shrink-0",
                  status === "overdue"
                    ? "text-rose-500"
                    : status === "urgent"
                      ? "text-amber-500"
                      : "text-slate-400",
                )}
              />
              {formatDeadline(task.deadline)}
              <RelativeDeadline deadline={task.deadline} status={status} />
            </span>

            {!compact && <StatusBadge status={status} className="sm:hidden" />}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {!compact && <StatusBadge status={status} className="mr-1 hidden sm:inline-flex" />}

          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Редактировать задачу «${task.title}»`}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Удалить задачу «${task.title}»`}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </li>

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить задачу?"
        description={`«${task.title}» будет удалена безвозвратно.`}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
});
