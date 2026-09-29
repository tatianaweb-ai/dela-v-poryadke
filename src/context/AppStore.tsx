"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createSeedProjects, createSeedTasks } from "@/lib/seed";
import { displayNameFromEmail } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { createId, parseProjects, parseTasks } from "@/lib/validators";
import type { Project, ProjectDraft, Task, TaskDraft, User } from "@/types";

interface AppStore {
  user: User | null;
  projects: Project[];
  tasks: Task[];
  /** `false`, пока не прочитаны данные из хранилища и не проверена сессия. */
  isReady: boolean;
  /** Просит Supabase отправить ссылку для входа. */
  requestMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
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

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const projectStorage = useLocalStorage<Project[]>(STORAGE_KEYS.projects, NO_PROJECTS, parseProjects);
  const taskStorage = useLocalStorage<Task[]>(STORAGE_KEYS.tasks, NO_TASKS, parseTasks);

  // Кто вошёл — определяет Supabase, а не локальное хранилище: иначе любой мог бы
  // дописать в браузере "dvp:user" и изобразить вход.
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthUser(data.user ?? null);
      setIsAuthReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const requestMagicLink = useCallback(async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // После клика по ссылке из письма браузер вернётся на главную.
      options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  const user = useMemo<User | null>(() => {
    if (!authUser?.email) return null;
    return {
      name: displayNameFromEmail(authUser.email),
      createdAt: authUser.created_at ?? new Date().toISOString(),
    };
  }, [authUser]);

  const isReady = projectStorage.isReady && taskStorage.isReady && isAuthReady;

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
      user,
      projects: projectStorage.value,
      tasks: taskStorage.value,
      isReady,
      requestMagicLink,
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
      user,
      projectStorage.value,
      taskStorage.value,
      isReady,
      requestMagicLink,
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
