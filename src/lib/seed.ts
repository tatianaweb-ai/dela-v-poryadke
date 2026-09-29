import { addDays, toISODate } from "@/lib/date";
import type { Project, Task } from "@/types";

/**
 * Демо-данные для первого запуска, чтобы интерфейс не выглядел пустым.
 *
 * Идентификаторы настоящие uuid: колонки в базе именно такие, и задачи должны
 * ссылаться на те же проекты, что получились здесь. Поэтому проекты создаются
 * первыми, а задачи получают уже готовые id.
 */

export interface SeedData {
  projects: Project[];
  tasks: Task[];
}

export function createSeedData(): SeedData {
  const now = new Date().toISOString();

  const landingId = crypto.randomUUID();
  const reportsId = crypto.randomUUID();

  const projects: Project[] = [
    {
      id: landingId,
      name: "Редизайн лендинга",
      description: "Обновить главную страницу: структура, тексты, адаптив.",
      createdAt: now,
    },
    {
      id: reportsId,
      name: "Квартальные отчёты",
      description: "Собрать и сдать отчётность за квартал.",
      createdAt: now,
    },
  ];

  const tasks: Task[] = [
    {
      id: crypto.randomUUID(),
      title: "Собрать структуру главной страницы",
      projectId: landingId,
      deadline: toISODate(addDays(2)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: crypto.randomUUID(),
      title: "Подготовить тексты для блока преимуществ",
      projectId: landingId,
      deadline: toISODate(addDays(6)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: crypto.randomUUID(),
      title: "Сверстать мобильную версию",
      projectId: landingId,
      deadline: toISODate(addDays(-1)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: crypto.randomUUID(),
      title: "Свести показатели по отделу продаж",
      projectId: reportsId,
      deadline: toISODate(addDays(0)),
      done: false,
      createdAt: now,
      completedAt: null,
    },
    {
      id: crypto.randomUUID(),
      title: "Согласовать отчёт с руководителем",
      projectId: reportsId,
      deadline: toISODate(addDays(10)),
      done: true,
      createdAt: now,
      completedAt: now,
    },
  ];

  return { projects, tasks };
}
