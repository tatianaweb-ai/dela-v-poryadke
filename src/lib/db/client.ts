import type { SupabaseClient } from "@supabase/supabase-js";

import type { Project, ProjectDraft, Task, TaskDraft } from "@/types";

/**
 * Слой доступа к данным. Наружу отдаёт тот же контракт, что и прежнее
 * локальное хранилище, поэтому компоненты интерфейса о нём ничего не знают.
 *
 * user_id в строки не пишем: его подставляет база из сессии. Указать чужой
 * нельзя — политика RLS отклонит вставку.
 */

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface TaskRow {
  id: string;
  title: string;
  project_id: string;
  deadline: string | null;
  done: boolean;
  created_at: string;
  completed_at: string | null;
}

/** База отдаёт `timestamptz` в ISO-8601, интерфейс ждёт `YYYY-MM-DDTHH:mm:ss…` без `Z`. */
function toClientTimestamp(value: string): string {
  return value.includes("T") ? value.replace("Z", "").replace(/\.\d+/, "").replace(/[+-]\d\d:\d\d$/, "") : value;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: toClientTimestamp(row.created_at),
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    deadline: row.deadline,
    done: row.done,
    createdAt: toClientTimestamp(row.created_at),
    completedAt: row.completed_at ? toClientTimestamp(row.completed_at) : null,
  };
}

function toProjectRow(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    created_at: project.createdAt,
  };
}

function toTaskRow(task: Task): TaskRow {
  return {
    id: task.id,
    title: task.title,
    project_id: task.projectId,
    deadline: task.deadline,
    done: task.done,
    created_at: task.createdAt,
    completed_at: task.completedAt,
  };
}

export async function fetchProjects(supabase: SupabaseClient): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();
  if (error) throw error;
  return (data ?? []).map(toProject);
}

export async function fetchTasks(supabase: SupabaseClient): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();
  if (error) throw error;
  return (data ?? []).map(toTask);
}

export async function createProject(
  supabase: SupabaseClient,
  draft: ProjectDraft,
  id: string,
  createdAt: string,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ id, name: draft.name.trim(), description: draft.description.trim(), created_at: createdAt })
    .returns<ProjectRow>()
    .single();
  if (error) throw error;
  return toProject(data);
}

export async function updateProjectRow(
  supabase: SupabaseClient,
  id: string,
  draft: ProjectDraft,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ name: draft.name.trim(), description: draft.description.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProjectRow(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  // Задачи удалит каскад в базе: повторно вычищать их не нужно.
}

export async function createTask(
  supabase: SupabaseClient,
  draft: TaskDraft,
  id: string,
  createdAt: string,
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      id,
      title: draft.title.trim(),
      project_id: draft.projectId,
      deadline: draft.deadline || null,
      created_at: createdAt,
    })
    .returns<TaskRow>()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function updateTaskRow(
  supabase: SupabaseClient,
  id: string,
  draft: TaskDraft,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      title: draft.title.trim(),
      project_id: draft.projectId,
      deadline: draft.deadline || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setTaskDone(supabase: SupabaseClient, id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTaskRow(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllUserData(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
  // Здесь обязательно разбираем поле error: сам объект ответа при успехе
  // не пустой (success: true, status: 204), и без разбора он всегда считался
  // бы ошибкой — из-за чего заполнение базы демо-данными обрывалось.
  const { error: projectError } = await supabase
    .from("projects")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (projectError) throw projectError;
}

export async function replaceAllUserData(
  supabase: SupabaseClient,
  projects: Project[],
  tasks: Task[],
): Promise<void> {
  await deleteAllUserData(supabase);
  if (projects.length > 0) {
    const { error } = await supabase.from("projects").insert(projects.map(toProjectRow));
    if (error) throw error;
  }
  if (tasks.length > 0) {
    const { error } = await supabase.from("tasks").insert(tasks.map(toTaskRow));
    if (error) throw error;
  }
}
