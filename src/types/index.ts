export interface User {
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  deadline: string | null;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
}

export type TaskStatus = "overdue" | "urgent" | "soon" | "planned" | "done";

export type TaskDraft = Omit<Task, "id" | "createdAt" | "completedAt" | "done">;

export type ProjectDraft = Pick<Project, "name" | "description">;

export type ViewTab = "dashboard" | "tasks" | "projects";
