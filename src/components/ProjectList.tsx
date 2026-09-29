"use client";

import { CalendarClock, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/context/AppStore";
import { daysUntil } from "@/lib/date";
import type { Project } from "@/types";

export interface ProjectListProps {
  onAdd: () => void;
  onEdit: (project: Project) => void;
  onOpenTasks: (projectId: string) => void;
}

export function ProjectList({ onAdd, onEdit, onOpenTasks }: ProjectListProps) {
  const { projects, tasks, deleteProject } = useAppStore();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const handleDelete = () => {
    if (!pendingDelete) return;

    deleteProject(pendingDelete.id);
    toast.success(`Проект «${pendingDelete.name}» удалён вместе с задачами`);
  };

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Проектов пока нет"
        description="Создайте первый проект, чтобы группировать задачи и видеть общий прогресс."
        action={
          <Button size="sm" onClick={onAdd}>
            <Plus className="size-4" />
            Создать проект
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Проекты</h2>
          <p className="text-sm text-slate-500">
            Всего {projects.length} · задач всего {tasks.length}
          </p>
        </div>
        <Button onClick={onAdd} className="w-full sm:w-auto">
          <Plus className="size-4" />
          Создать проект
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id);
          const activeCount = projectTasks.filter((task) => !task.done).length;
          const doneCount = projectTasks.length - activeCount;
          const nextDeadline = projectTasks
            .filter((task) => !task.done && task.deadline)
            .map((task) => ({ task, diff: daysUntil(task.deadline)! }))
            .filter((entry) => entry.diff !== null)
            .sort((a, b) => a.diff - b.diff)[0];

          const progress = projectTasks.length === 0 ? 0 : Math.round((doneCount / projectTasks.length) * 100);
          const isUrgent = nextDeadline !== undefined && nextDeadline.diff <= 2;

          return (
            <article
              key={project.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold tracking-tight text-slate-900">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {project.description || "Без описания"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onEdit(project)}
                    aria-label={`Редактировать проект «${project.name}»`}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(project)}
                    aria-label={`Удалить проект «${project.name}»`}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>
                    Задач: <span className="font-medium text-slate-700">{projectTasks.length}</span>
                  </span>
                  <span>
                    Активных: <span className="font-medium text-amber-600">{activeCount}</span>
                  </span>
                  <span>
                    Готово: <span className="font-medium text-emerald-600">{doneCount}</span>
                  </span>
                  <span className="text-slate-400">· {progress}%</span>
                </div>

                {nextDeadline && (
                  <p
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      isUrgent ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    <CalendarClock className="size-3.5" />
                    Ближайший дедлайн: {nextDeadline.task.title}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenTasks(project.id)}
                className="mt-4 w-full rounded-xl bg-slate-50 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Открыть задачи
              </button>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Удалить проект?"
        description={`Проект «${pendingDelete?.name ?? ""}» и все его задачи будут удалены безвозвратно.`}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
