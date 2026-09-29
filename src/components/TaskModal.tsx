"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { validateTaskDraft } from "@/lib/validators";
import type { Project, Task, TaskDraft } from "@/types";

export interface TaskModalProps {
  projects: Project[];
  /** `null` — создание новой задачи, иначе — редактирование существующей. */
  task: Task | null;
  defaultProjectId?: string;
  onClose: () => void;
  onSubmit: (draft: TaskDraft) => void;
}

/** Компонент монтируется только в момент открытия, поэтому стартовое состояние берётся из пропсов. */
export function TaskModal({ projects, task, defaultProjectId, onClose, onSubmit }: TaskModalProps) {
  const [form, setForm] = useState(() =>
    task
      ? { title: task.title, projectId: task.projectId, deadline: task.deadline ?? "" }
      : {
          title: "",
          projectId:
            defaultProjectId && projects.some((project) => project.id === defaultProjectId)
              ? defaultProjectId
              : (projects[0]?.id ?? ""),
          deadline: "",
        },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const draft: TaskDraft = {
      title: form.title.trim(),
      projectId: form.projectId,
      deadline: form.deadline || null,
    };

    const nextErrors = validateTaskDraft(draft, { projects });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit(draft);
    onClose();
  };

  return (
    <Modal
      open
      title={task ? "Редактировать задачу" : "Новая задача"}
      description={
        task
          ? "Измените название, проект или дедлайн"
          : "Укажите название, проект и желаемый дедлайн"
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="task-form">
            {task ? "Сохранить" : "Добавить задачу"}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Название задачи" htmlFor="task-title" error={errors.title} required>
          <Input
            id="task-title"
            autoFocus
            placeholder="Например, подготовить презентацию"
            value={form.title}
            invalid={Boolean(errors.title)}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </Field>

        <Field label="Проект" htmlFor="task-project" error={errors.projectId} required>
          <Select
            id="task-project"
            value={form.projectId}
            invalid={Boolean(errors.projectId)}
            onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
          >
            <option value="" disabled>
              — выберите проект —
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>

        {projects.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200 ring-inset">
            Сначала создайте хотя бы один проект — задача должна принадлежать проекту.
          </p>
        )}

        <Field
          label="Дедлайн"
          htmlFor="task-deadline"
          error={errors.deadline}
          hint="Необязательно. Оставьте пустым, если срок не установлен."
        >
          <Input
            id="task-deadline"
            type="date"
            value={form.deadline}
            invalid={Boolean(errors.deadline)}
            onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}
