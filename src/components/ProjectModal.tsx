"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { validateProjectDraft } from "@/lib/validators";
import type { Project, ProjectDraft } from "@/types";

const MAX_NAME = 80;
const MAX_DESCRIPTION = 300;

export interface ProjectModalProps {
  projects: Project[];
  /** `null` — создание нового проекта, иначе — редактирование существующего. */
  project: Project | null;
  onClose: () => void;
  onSubmit: (draft: ProjectDraft) => void;
}

/** Компонент монтируется только в момент открытия, поэтому стартовое состояние берётся из пропсов. */
export function ProjectModal({ projects, project, onClose, onSubmit }: ProjectModalProps) {
  const [draft, setDraft] = useState<ProjectDraft>(() =>
    project
      ? { name: project.name, description: project.description }
      : { name: "", description: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const others = projects.filter((item) => item.id !== project?.id);
    const nextErrors = validateProjectDraft(draft, others);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({ name: draft.name.trim(), description: draft.description.trim() });
    onClose();
  };

  return (
    <Modal
      open
      title={project ? "Редактировать проект" : "Новый проект"}
      description={
        project ? "Обновите название или описание" : "Проект помогает группировать задачи по смыслу"
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="project-form">
            {project ? "Сохранить" : "Создать проект"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Название проекта" htmlFor="project-name" error={errors.name} required>
          <Input
            id="project-name"
            autoFocus
            placeholder="Например, Запуск нового сайта"
            maxLength={MAX_NAME + 20}
            value={draft.name}
            invalid={Boolean(errors.name)}
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
          />
        </Field>

        <Field
          label="Описание"
          htmlFor="project-description"
          error={errors.description}
          hint={`Необязательно. ${draft.description.trim().length}/${MAX_DESCRIPTION}`}
        >
          <Textarea
            id="project-description"
            placeholder="Коротко: зачем этот проект и что в нём должно получиться"
            maxLength={MAX_DESCRIPTION + 40}
            value={draft.description}
            invalid={Boolean(errors.description)}
            onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}
