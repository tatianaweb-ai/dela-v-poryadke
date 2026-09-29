import { parseISODate } from "@/lib/date";
import type { Project, ProjectDraft, Task, TaskDraft, User } from "@/types";

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.createdAt === "string"
  );
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.projectId === "string" &&
    (typeof candidate.deadline === "string" || candidate.deadline === null) &&
    typeof candidate.done === "boolean" &&
    typeof candidate.createdAt === "string"
  );
}

export function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return typeof candidate.name === "string" && candidate.name.trim().length > 0;
}

/** Десериализаторы бросают ошибку на повреждённых данных — хук откатится к начальному значению. */
export function parseProjects(raw: string): Project[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Ожидался массив проектов");
  return parsed.filter(isProject);
}

export function parseTasks(raw: string): Task[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Ожидался массив задач");
  return parsed.filter(isTask);
}

export function parseUser(raw: string): User | null {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null) return null;
  if (!isUser(parsed)) throw new Error("Некорректные данные пользователя");
  return parsed;
}

export function validateProjectDraft(
  draft: ProjectDraft,
  existing: Project[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();

  if (!name) {
    errors.name = "Введите название проекта";
  } else if (name.length > 80) {
    errors.name = "Не более 80 символов";
  } else if (
    existing.some((project) => project.name.trim().toLowerCase() === name.toLowerCase())
  ) {
    errors.name = "Проект с таким названием уже существует";
  }

  if (draft.description.trim().length > 300) {
    errors.description = "Не более 300 символов";
  }

  return errors;
}

export function validateTaskDraft(
  draft: TaskDraft,
  options: { projects: Project[] },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = draft.title.trim();

  if (!title) {
    errors.title = "Введите название задачи";
  } else if (title.length > 140) {
    errors.title = "Не более 140 символов";
  }

  if (!draft.projectId) {
    errors.projectId = "Выберите проект";
  } else if (!options.projects.some((project) => project.id === draft.projectId)) {
    errors.projectId = "Проект не найден — выберите другой";
  }

  if (draft.deadline && !parseISODate(draft.deadline)) {
    errors.deadline = "Укажите корректную дату";
  }

  return errors;
}
