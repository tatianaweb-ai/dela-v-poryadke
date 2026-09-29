import { parseISODate } from "@/lib/date";
import type { Project, ProjectDraft, TaskDraft } from "@/types";

/**
 * Проверки форм. Разбор данных из хранилища больше не нужен: единственный
 * источник проектов и задач — база, а она отдаёт уже проверенные строки.
 */
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
