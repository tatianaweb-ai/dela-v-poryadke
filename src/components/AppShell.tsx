"use client";

import { useEffect, useRef, useState } from "react";

import { AuthScreen } from "@/components/AuthScreen";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";
import { NameSetupScreen } from "@/components/NameSetupScreen";
import { ProjectList } from "@/components/ProjectList";
import { ProjectModal } from "@/components/ProjectModal";
import { ResetPasswordScreen } from "@/components/ResetPasswordScreen";
import { TaskList } from "@/components/TaskList";
import { TaskModal } from "@/components/TaskModal";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/context/AppStore";
import type { Project, ProjectDraft, Task, TaskDraft, ViewTab } from "@/types";

export function AppShell() {
  const { user, projects, tasks, needsDisplayName, needsPasswordReset, dataError, addProject, updateProject, addTask, updateTask } =
    useAppStore();
  const toast = useToast();

  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [projectFilterId, setProjectFilterId] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Ошибку записи показываем один раз, а не на каждый последующий рендер.
  const shownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!dataError || shownErrorRef.current === dataError) return;
    shownErrorRef.current = dataError;
    toast.error(dataError);
  }, [dataError, toast]);

  if (!user) return <AuthScreen />;
  if (needsPasswordReset) return <ResetPasswordScreen />;
  if (needsDisplayName) return <NameSetupScreen />;

  const handleOpenTaskCreate = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleOpenTaskEdit = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSubmitTask = (draft: TaskDraft) => {
    if (editingTask) {
      updateTask(editingTask.id, draft);
      toast.success("Задача обновлена");
    } else {
      addTask(draft);
      toast.success("Задача добавлена");
    }
  };

  const handleOpenProjectCreate = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };

  const handleOpenProjectEdit = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const handleSubmitProject = (draft: ProjectDraft) => {
    if (editingProject) {
      updateProject(editingProject.id, draft);
      toast.success("Проект обновлён");
    } else {
      addProject(draft);
      toast.success("Проект создан");
    }
  };

  const handleOpenProjectTasks = (projectId: string) => {
    setProjectFilterId(projectId);
    setTab("tasks");
  };

  const handleTabChange = (next: ViewTab) => {
    if (next !== "tasks") setProjectFilterId(null);
    setTab(next);
  };

  const filteredProject = projectFilterId
    ? projects.find((project) => project.id === projectFilterId) ?? null
    : null;

  const scopedTasks = filteredProject
    ? tasks.filter((task) => task.projectId === filteredProject.id)
    : tasks;

  return (
    <div className="min-h-dvh bg-slate-50">
      <Header activeTab={tab} onTabChange={handleTabChange} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {tab === "dashboard" && (
          <Dashboard
            onNavigate={handleTabChange}
            onEditTask={handleOpenTaskEdit}
            onAddTask={handleOpenTaskCreate}
          />
        )}

        {tab === "tasks" && (
          <div className="space-y-4">
            {filteredProject && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                    Проект
                  </p>
                  <p className="truncate font-semibold tracking-tight text-slate-900">
                    {filteredProject.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectFilterId(null)}
                  className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Показать все задачи
                </button>
              </div>
            )}

            <TaskList
              tasks={scopedTasks}
              projects={projects}
              onAdd={handleOpenTaskCreate}
              onEdit={handleOpenTaskEdit}
              fixedProjectId={filteredProject?.id}
            />
          </div>
        )}

        {tab === "projects" && (
          <ProjectList
            onAdd={handleOpenProjectCreate}
            onEdit={handleOpenProjectEdit}
            onOpenTasks={handleOpenProjectTasks}
          />
        )}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-center text-xs text-slate-400 sm:px-6">
        Дела в порядке · данные хранятся в базе и доступны только вам
      </footer>

      {taskModalOpen && (
        <TaskModal
          projects={projects}
          task={editingTask}
          defaultProjectId={filteredProject?.id}
          onClose={() => setTaskModalOpen(false)}
          onSubmit={handleSubmitTask}
        />
      )}

      {projectModalOpen && (
        <ProjectModal
          projects={projects}
          project={editingProject}
          onClose={() => setProjectModalOpen(false)}
          onSubmit={handleSubmitProject}
        />
      )}
    </div>
  );
}
