"use client";

import { ListTodo, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { TaskItem } from "@/components/TaskItem";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { daysUntil, getTaskStatus } from "@/lib/date";
import type { Project, Task } from "@/types";

export type TaskFilter = "all" | "active" | "done" | "overdue";
export type TaskSort = "deadline" | "created" | "title";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "overdue", label: "Просроченные" },
  { id: "done", label: "Выполненные" },
];

const SORTS: { id: TaskSort; label: string }[] = [
  { id: "deadline", label: "По дедлайну" },
  { id: "created", label: "По дате создания" },
  { id: "title", label: "По названию" },
];

export interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  onAdd: () => void;
  onEdit: (task: Task) => void;
  fixedProjectId?: string;
}

function compareByDeadline(a: Task, b: Task): number {
  if (a.deadline && b.deadline) {
    const diff = daysUntil(a.deadline)! - daysUntil(b.deadline)!;
    if (diff !== 0) return diff;
  } else if (a.deadline) {
    return -1;
  } else if (b.deadline) {
    return 1;
  }
  return 0;
}

export function TaskList({ tasks, projects, onAdd, onEdit, fixedProjectId }: TaskListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sort, setSort] = useState<TaskSort>("deadline");

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) map.set(project.id, project.name);
    return map;
  }, [projects]);

  const counts = useMemo(() => {
    let active = 0;
    let done = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (task.done) done += 1;
      else if (getTaskStatus(task) === "overdue") overdue += 1;
      else active += 1;
    }

    return { all: tasks.length, active, done, overdue };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (fixedProjectId && task.projectId !== fixedProjectId) return false;
      if (projectFilter !== "all" && task.projectId !== projectFilter) return false;

      if (filter === "active" && task.done) return false;
      if (filter === "done" && !task.done) return false;
      if (filter === "overdue" && (task.done || getTaskStatus(task) !== "overdue")) return false;

      if (normalized) {
        const haystack = `${task.title} ${projectNameById.get(task.projectId) ?? ""}`.toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (sort === "title") return a.title.localeCompare(b.title, "ru");
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
      return compareByDeadline(a, b);
    });
  }, [tasks, query, filter, projectFilter, sort, fixedProjectId, projectNameById]);

  const hasFilters = query.trim() !== "" || filter !== "all" || projectFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    setProjectFilter("all");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию задачи или проекту"
            aria-label="Поиск задач"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3.5 pl-10 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none"
          />
        </div>
        <Button onClick={onAdd} className="w-full sm:w-auto">
          <Plus className="size-4" />
          Добавить задачу
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((item) => {
            const isActive = filter === item.id;
            const count = counts[item.id];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                )}
              >
                {item.label}
                <span className={cn("text-xs tabular-nums", isActive ? "text-slate-300" : "text-slate-400")}>
                  {count}
                </span>
              </button>
            );
          })}

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
            >
              <X className="size-3.5" />
              Сбросить
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!fixedProjectId && (
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              aria-label="Фильтр по проекту"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Все проекты</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}

          <label className="inline-flex items-center gap-1.5 text-sm text-slate-500">
            <SlidersHorizontal className="size-4 text-slate-400" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as TaskSort)}
              aria-label="Сортировка"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visibleTasks.length > 0 ? (
        <ul className="space-y-2">
          {visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projectName={projectNameById.get(task.projectId) ?? ""}
              onEdit={onEdit}
              showProject={!fixedProjectId}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ListTodo}
          title={hasFilters ? "Ничего не найдено" : "Задач пока нет"}
          description={
            hasFilters
              ? "Попробуйте изменить запрос или сбросить фильтры."
              : "Добавьте первую задачу и укажите дедлайн — приложение напомнит о сроке."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : (
              <Button size="sm" onClick={onAdd}>
                <Plus className="size-4" />
                Добавить задачу
              </Button>
            )
          }
        />
      )}

      {visibleTasks.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          Показано {visibleTasks.length} из {tasks.length}
        </p>
      )}
    </section>
  );
}
