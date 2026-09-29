"use client";

import { ArrowRight, CalendarClock, CheckCircle2, ListTodo, Sparkles } from "lucide-react";

import { StatCards, buildStatCards } from "@/components/StatCards";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, RelativeDeadline } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/context/AppStore";
import { formatDateWithWeekday, getTaskStatus, greetingFor } from "@/lib/date";
import type { Task, ViewTab } from "@/types";

const MAX_DEADLINES = 5;

export interface DashboardProps {
  onNavigate: (tab: ViewTab) => void;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
}

export function Dashboard({ onNavigate, onEditTask, onAddTask }: DashboardProps) {
  const { user, projects, tasks } = useAppStore();

  const activeTasks = tasks.filter((task) => !task.done);
  const doneCount = tasks.length - activeTasks.length;
  const overdueCount = activeTasks.filter((task) => getTaskStatus(task) === "overdue").length;

  const upcoming = [...activeTasks]
    .filter((task) => task.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, MAX_DEADLINES);

  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const completionRate = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm text-slate-500">{greetingFor()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {firstName ? `${firstName}, всё под контролем` : "Всё под контролем"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          {tasks.length === 0
            ? "Начните с создания проекта и первой задачи — дальше следить за дедлайнами станет проще."
            : `Выполнено ${completionRate}% задач. ${
                overdueCount > 0
                  ? `Просроченных задач: ${overdueCount} — стоит начать с них.`
                  : "Просроченных задач нет."
              }`}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button onClick={onAddTask}>
            <ListTodo className="size-4" />
            Добавить задачу
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("projects")}>
            <ArrowRight className="size-4" />
            К проектам
          </Button>
        </div>
      </section>

      <StatCards
        cards={buildStatCards({
          projects: projects.length,
          active: activeTasks.length,
          done: doneCount,
          overdue: overdueCount,
        })}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
              <CalendarClock className="size-4.5 text-indigo-500" />
              Ближайшие дедлайны
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Задачи с наступающим сроком</p>
          </div>
          {upcoming.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate("tasks")}>
              Все задачи
            </Button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Дедлайнов не запланировано"
            description="Добавьте к задачам сроки — и здесь появятся ближайшие дедлайны с подсветкой просроченных."
            action={
              <Button size="sm" variant="secondary" onClick={onAddTask}>
                Добавить задачу со сроком
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((task) => {
              const status = getTaskStatus(task);
              const isOverdue = status === "overdue";

              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onEditTask(task)}
                    className="group flex w-full items-center gap-3 py-3 text-left transition-colors first:pt-0 last:pb-0"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ring-1 ring-inset ${
                        isOverdue
                          ? "bg-rose-50 text-rose-600 ring-rose-200"
                          : status === "urgent"
                            ? "bg-amber-50 text-amber-600 ring-amber-200"
                            : "bg-slate-50 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {new Intl.DateTimeFormat("ru-RU", { day: "2-digit" }).format(
                        new Date(`${task.deadline}T00:00:00`),
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isOverdue
                            ? "text-rose-700"
                            : status === "urgent"
                              ? "text-amber-700"
                              : "text-slate-800"
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                        <span className="min-w-0 truncate">
                          {projectNameById.get(task.projectId) ?? "Без проекта"} ·{" "}
                          {formatDateWithWeekday(task.deadline)}
                        </span>
                        <RelativeDeadline deadline={task.deadline} status={status} />
                      </span>
                    </span>

                    <StatusBadge status={status} className="hidden shrink-0 sm:inline-flex" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <Sparkles className="size-4.5 text-indigo-500" />
          Активные проекты
        </h2>

        {projects.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Проектов пока нет"
            description="Создайте проект, чтобы объединить задачи по общей цели."
            action={
              <Button size="sm" onClick={() => onNavigate("projects")}>
                Создать проект
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {projects.slice(0, 4).map((project) => {
              const projectTasks = tasks.filter((task) => task.projectId === project.id);
              const done = projectTasks.filter((task) => task.done).length;
              const progress =
                projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);

              return (
                <li
                  key={project.id}
                  className="rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-slate-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">{project.name}</p>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
                      {progress}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {done} из {projectTasks.length} задач выполнено
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
