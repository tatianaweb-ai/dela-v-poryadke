import type { Task, TaskStatus } from "@/types";

const MS_IN_DAY = 86_400_000;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function today(): Date {
  return startOfDay(new Date());
}

export function addDays(days: number, from: Date = new Date()): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

/** Converts a `YYYY-MM-DD` value into a local Date at midnight. */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return startOfDay(date);
}

/** Formats a Date as a `YYYY-MM-DD` value suitable for <input type="date">. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayISODate(): string {
  return toISODate(today());
}

/** Нижняя граница «подросткового» диапазона: 11–14 всегда требуют родительного: «дней». */
const PLURAL_TEENS = 11;
/** Граница статуса «скоро»: дедлайн не дальше трёх дней. */
const SOON_DAYS = 3;

function plural(value: number, forms: [string, string, string]): string {
  const abs = Math.abs(value);
  const mod100 = abs % 100;
  const mod10 = abs % 10;

  if (mod100 >= PLURAL_TEENS && mod100 <= PLURAL_TEENS + 3) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function formatDeadline(value: string | null): string {
  if (!value) return "Без дедлайна";

  const date = parseISODate(value);
  if (!date) return "Некорректная дата";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateWithWeekday(value: string | null): string {
  if (!value) return "Без дедлайна";

  const date = parseISODate(value);
  if (!date) return "Некорректная дата";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "short",
  }).format(date);
}

/** Returns the number of calendar days from today to the deadline (negative = past). */
export function daysUntil(deadline: string | null): number | null {
  const date = parseISODate(deadline ?? "");
  if (!date) return null;
  return Math.round((date.getTime() - today().getTime()) / MS_IN_DAY);
}

export function getTaskStatus(task: Pick<Task, "done" | "deadline">): TaskStatus {
  if (task.done) return "done";

  const diff = daysUntil(task.deadline);
  if (diff === null) return "planned";
  if (diff < 0) return "overdue";
  if (diff === 0) return "urgent";
  if (diff <= SOON_DAYS) return "soon";
  return "planned";
}

/**
 * Относительная подпись дедлайна: «Сегодня», «Завтра», «Через 3 дня», «2 дня назад».
 *
 * Для просрочки пишем только сдвиг, без слова «Просрочено» — оно уже есть в бейдже
 * статуса рядом, и повтор читался бы как «Просрочено на 1 день · Просрочено».
 */
export function formatRelativeDeadline(deadline: string | null): string {
  const diff = daysUntil(deadline);
  if (diff === null) return "Дедлайн не задан";

  if (diff === 0) return "Сегодня";
  if (diff > 0) {
    if (diff === 1) return "Завтра";
    return `Через ${diff} ${plural(diff, ["день", "дня", "дней"])}`;
  }

  const overdue = Math.abs(diff);
  return `${overdue} ${plural(overdue, ["день", "дня", "дней"])} назад`;
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}
