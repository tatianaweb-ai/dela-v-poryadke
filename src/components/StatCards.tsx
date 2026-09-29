"use client";

import { CheckCircle2, FolderKanban, ListTodo, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "indigo" | "amber" | "emerald" | "rose";
  hint: string;
}

const TONES: Record<StatCard["tone"], { icon: string; value: string }> = {
  indigo: { icon: "bg-indigo-50 text-indigo-600", value: "text-indigo-600" },
  amber: { icon: "bg-amber-50 text-amber-600", value: "text-amber-600" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-600" },
  rose: { icon: "bg-rose-50 text-rose-600", value: "text-rose-600" },
};

export function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const tone = TONES[card.tone];
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</p>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone.icon)}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl", tone.value)}>
              {card.value}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">{card.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

export function buildStatCards(input: {
  projects: number;
  active: number;
  done: number;
  overdue: number;
}): StatCard[] {
  return [
    {
      id: "projects",
      label: "Всего проектов",
      value: input.projects,
      icon: FolderKanban,
      tone: "indigo",
      hint: input.projects === 0 ? "Создайте первый проект" : "Активные рабочие пространства",
    },
    {
      id: "active",
      label: "Активных задач",
      value: input.active,
      icon: ListTodo,
      tone: "amber",
      hint: input.active === 0 ? "Всё под контролем" : "Ещё не выполнено",
    },
    {
      id: "done",
      label: "Выполнено",
      value: input.done,
      icon: CheckCircle2,
      tone: "emerald",
      hint: "Отмечено как готово",
    },
    {
      id: "overdue",
      label: "Просрочено",
      value: input.overdue,
      icon: TriangleAlert,
      tone: "rose",
      hint: input.overdue === 0 ? "Просроченных нет" : "Нужно взять в работу",
    },
  ];
}
