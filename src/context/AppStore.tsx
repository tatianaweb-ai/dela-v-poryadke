"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createSeedProjects, createSeedTasks, createSeedUser } from "@/lib/seed";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import {
  createId,
  parseProjects,
  parseTasks,
  parseUser,
} from "@/lib/validators";
import type { Project, ProjectDraft, Task, TaskDraft, User } from "@/types";

interface AppStore {
  user: User | null;
  projects: Project[];
  tasks: Task[];
  /** `false`, пока данные не прочитаны из LocalStorage. */
  isReady: boolean;
  signIn: (name: string) => void;
  signOut: () => void;
  addProject: (draft: ProjectDraft) => Project;
  updateProject: (id: string, draft: ProjectDraft) => void;
  deleteProject: (id: string) => void;
  addTask: (draft: TaskDraft) => Task;
  updateTask: (id: string, draft: TaskDraft) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  resetDemoData: () => void;
  clearAllData: () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

/** Стабильные ссылки нужны, чтобы `initialValue` не менял идентичность на каждом рендере. */
const NO_PROJECTS: Project[] = [];
const NO_TASKS: Task[] = [];
const NO_USER: User | null = null;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const userStorage = useLocalStorage<User | null>(STORAGE_KEYS.user, NO_USER, parseUser);
  const projectStorage = useLocalStorage<Project[]>(STORAGE_KEYS.projects, NO_PROJECTS, parseProjects);
  const taskStorage = useLocalStorage<Task[]>(STORAGE_KEYS.tasks, NO_TASKS, parseTasks);

  const isReady = userStorage.isReady && projectStorage.isReady && taskStorage.isReady;

  const signIn = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      userStorage.setValue(createSeedUser(trimmed));
    },
    [userStorage],
  );

  const signOut = useCallback(() => {
    userStorage.setValue(null);
  }, [userStorage]);

  const addProject = useCallback(
    (draft: ProjectDraft) => {
      const project: Project = {
        id: createId("prj"),
        name: draft.name.trim(),
        description: draft.description.trim(),
        createdAt: new Date().toISOString(),
      };
      projectStorage.setValue((previous) => [project, ...previous]);
      return project;
    },
    [projectStorage],
  );

  const updateProject = useCallback(
    (id: string, draft: ProjectDraft) => {
      projectStorage.setValue((previous) =>
        previous.map((project) =>
          project.id === id
            ? { ...project, name: draft.name.trim(), description: draft.description.trim() }
            : project,
        ),
      );
    },
    [projectStorage],
  );

  const deleteProject = useCallback(
    (id: string) => {
      projectStorage.setValue((previous) => previous.filter((project) => project.id !== id));
      taskStorage.setValue((previous) => previous.filter((task) => task.projectId !== id));
    },
    [projectStorage, taskStorage],
  );

  const addTask = useCallback(
    (draft: TaskDraft) => {
      const task: Task = {
        id: createId("tsk"),
        title: draft.title.trim(),
        projectId: draft.projectId,
        deadline: draft.deadline || null,
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      taskStorage.setValue((previous) => [task, ...previous]);
      return task;
    },
    [taskStorage],
  );

  const updateTask = useCallback(
    (id: string, draft: TaskDraft) => {
      taskStorage.setValue((previous) =>
        previous.map((task) =>
          task.id === id
            ? { ...task, title: draft.title.trim(), projectId: draft.projectId, deadline: draft.deadline || null }
            : task,
        ),
      );
    },
    [taskStorage],
  );

  const toggleTask = useCallback(
    (id: string) => {
      taskStorage.setValue((previous) =>
        previous.map((task) =>
          task.id === id
            ? {
                ...task,
                done: !task.done,
                completedAt: task.done ? null : new Date().toISOString(),
              }
            : task,
        ),
      );
    },
    [taskStorage],
  );

  const deleteTask = useCallback(
    (id: string) => {
      taskStorage.setValue((previous) => previous.filter((task) => task.id !== id));
    },
    [taskStorage],
  );

  const resetDemoData = useCallback(() => {
    projectStorage.setValue(createSeedProjects());
    taskStorage.setValue(createSeedTasks());
  }, [projectStorage, taskStorage]);

  const clearAllData = useCallback(() => {
    projectStorage.setValue([]);
    taskStorage.setValue([]);
  }, [projectStorage, taskStorage]);

  const value = useMemo<AppStore>(
    () => ({
      user: userStorage.value,
      projects: projectStorage.value,
      tasks: taskStorage.value,
      isReady,
      signIn,
      signOut,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      resetDemoData,
      clearAllData,
    }),
    [
      userStorage.value,
      projectStorage.value,
      taskStorage.value,
      isReady,
      signIn,
      signOut,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      resetDemoData,
      clearAllData,
    ],
  );

  // Первый запуск: если хранилище пустое, наполняем его демо-данными.
  const projectsCount = projectStorage.value.length;
  const tasksCount = taskStorage.value.length;
  const setProjects = projectStorage.setValue;
  const setTasks = taskStorage.setValue;

  useEffect(() => {
    if (!isReady) return;
    if (projectsCount === 0) setProjects(createSeedProjects());
    if (tasksCount === 0) setTasks(createSeedTasks());
  }, [isReady, projectsCount, tasksCount, setProjects, setTasks]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useAppStore должен вызываться внутри <AppStoreProvider>");
  }
  return store;
}
