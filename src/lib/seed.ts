import { addDays, toISODate } from "@/lib/date";
import type { Project, Task, User } from "@/types";

/** Демо-данные для первого запуска, чтобы интерфейс не выглядел пустым. */
export function createSeedProjects(): Project[] {
  const now = new Date().toISOString();

  return [
    {
      id: "seed-project-1",
      name: "Редизайн лендинга",
      description: "Обновить главную страницу: структура, тексты, адаптив.",
      createdAt: now,
    },
    {
      id: "seed-project-2",
      name: "Квартальные отчёты",
      description: "Собрать и сдать отчётность за квартал.",
      createdAt: now,
    },
  ];
}

export function createSeedTasks(): Task[] {
  const now = new Date().toISOString();

  return [
    {
      id: "seed-task-1",
      title: "Собрать структуру главной страницы",
      projectId: "seed-project-1",
      deadline: toISODate(addDays(2)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: "seed-task-2",
      title: "Подготовить тексты для блока преимуществ",
      projectId: "seed-project-1",
      deadline: toISODate(addDays(6)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: "seed-task-3",
      title: "Сверстать мобильную версию",
      projectId: "seed-project-1",
      deadline: toISODate(addDays(-1)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: "seed-task-4",
      title: "Свести показатели по отделу продаж",
      projectId: "seed-project-2",
      deadline: toISODate(addDays(0)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: "seed-task-5",
      title: "Согласовать отчёт с руководителем",
      projectId: "seed-project-2",
      deadline: toISODate(addDays(10)),
      done: true,
      createdAt: now,
      completedAt: now,
    },
  ];
}

export function createSeedUser(name: string): User {
  return { name, createdAt: new Date().toISOString() };
}
