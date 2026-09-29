"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createProject,
  createTask,
  deleteAllUserData,
  deleteProjectRow,
  deleteTaskRow,
  fetchProjects,
  fetchTasks,
  replaceAllUserData,
  setTaskDone,
  updateProjectRow,
  updateTaskRow,
} from "@/lib/db/client";
import { createSeedData } from "@/lib/seed";
import { displayNameFromEmail, MAX_DISPLAY_NAME_LENGTH, MIN_DISPLAY_NAME_LENGTH } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectDraft, Task, TaskDraft, User } from "@/types";

interface AppStore {
  user: User | null;
  projects: Project[];
  tasks: Task[];
  /** `false`, пока не прочитаны данные из хранилища и не проверена сессия. */
  isReady: boolean;
  /** Человек вошёл, но ещё не назвал себя — показываем экран с именем. */
  needsDisplayName: boolean;
  /** Текст последней ошибки записи или чтения; интерфейс сам гасит его по таймеру. */
  dataError: string | null;
  /** Просит Supabase отправить ссылку для входа. */
  requestMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>;
  saveDisplayName: (name: string) => Promise<void>;
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

/**
 * Достаёт имя из user_metadata. Возвращает null, если имя ещё не задано или
 * содержит мусор — тогда приложение попросит его ввести.
 */
function readDisplayName(user: SupabaseUser | null): string | null {
  const raw = user?.user_metadata?.display_name;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length >= MIN_DISPLAY_NAME_LENGTH && trimmed.length <= MAX_DISPLAY_NAME_LENGTH
    ? trimmed
    : null;
}

/** Стабильные ссылки нужны, чтобы `initialValue` не менял идентичность на каждом рендере. */
const NO_PROJECTS: Project[] = [];
const NO_TASKS: Task[] = [];

export function AppStoreProvider({ children }: { children: ReactNode }) {
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

  const saveDisplayName = useCallback(async (name: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  // Данные живут в базе и приходят вместе с сессией. Пока сессии нет — пустые
  // массивы и isReady === false, чтобы интерфейс не мигнул демо-данными.
  const [projects, setProjects] = useState<Project[]>(NO_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(NO_TASKS);

  // Готовность и ошибка привязаны к пользователю: не нужно сбрасывать их в
  // эффекте, достаточно пометить, для кого они актуальны.
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ userId: string; message: string } | null>(null);

  const userId = authUser?.id ?? null;
  const userIdRef = useRef<string | null>(null);

  // Ref нужен, чтобы обработчики записи знали, кому принадлежит ошибка,
  // не меняя свою идентичность (иначе перезагружался бы эффект выше).
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Ошибка записи показывается один раз, как всплывашка, и не блокирует работу.
  const reportWriteError = useCallback((error: unknown) => {
    const owner = userIdRef.current;
    if (!owner) return;
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    setLoadError({ userId: owner, message: `Не удалось сохранить: ${message}` });
  }, []);

  const dataError = loadError && loadError.userId === userId ? loadError.message : null;

  useEffect(() => {
    // Без входа загружать нечего: наружу данные всё равно не отдаются
    // (см. visibleProjects/visibleTasks ниже).
    if (!userId) return;

    const supabase = createClient();
    let active = true;

    (async () => {
      try {
        const [loadedProjects, loadedTasks] = await Promise.all([
          fetchProjects(supabase),
          fetchTasks(supabase),
        ]);
        if (!active) return;

        // База пуста — значит это первый вход. Показываем витрину для демо.
        if (loadedProjects.length === 0 && loadedTasks.length === 0) {
          const seed = createSeedData();
          setProjects(seed.projects);
          setTasks(seed.tasks);
          setLoadedForUserId(userId);
          replaceAllUserData(supabase, seed.projects, seed.tasks).catch(reportWriteError);
          return;
        }

        setProjects(loadedProjects);
        setTasks(loadedTasks);
        setLoadedForUserId(userId);
      } catch {
        if (!active) return;
        setProjects(NO_PROJECTS);
        setTasks(NO_TASKS);
        setLoadedForUserId(userId);
        setLoadError({
          userId,
          message: "Не удалось загрузить данные. Проверьте соединение и обновите страницу.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, reportWriteError]);

  // Имя живёт в user_metadata: изменяет его только владелец своей сессии,
  // из кода приложения — никак.
  const displayName = readDisplayName(authUser);

  const user = useMemo<User | null>(() => {
    if (!authUser?.email) return null;
    return {
      name: displayName ?? displayNameFromEmail(authUser.email),
      createdAt: authUser.created_at ?? new Date().toISOString(),
    };
  }, [authUser, displayName]);

  const needsDisplayName = Boolean(authUser?.email) && !displayName;

  const isReady = isAuthReady && (userId ? loadedForUserId === userId : true);

  // Пока нет входа, наружу не отдаём ничего: чужие данные не должны мигнуть
  // в интерфейсе ни на одном кадре — даже если смена пользователя быстрая.
  const visibleProjects = userId ? projects : NO_PROJECTS;
  const visibleTasks = userId ? tasks : NO_TASKS;

  /**
   * Оптимистичное обновление: сначала меняем локальное состояние (интерфейс
   * реагирует мгновенно), затем пишем в базу. При отказе базы возвращаем
   * прежнее значение — пользователь видит, что действие не удалось.
   */
  const addProject = useCallback(
    (draft: ProjectDraft) => {
      const project: Project = {
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        createdAt: new Date().toISOString(),
      };
      setProjects((previous) => [project, ...previous]);
      createProject(createClient(), draft, project.id, project.createdAt).catch(reportWriteError);
      return project;
    },
    [reportWriteError],
  );

  const updateProject = useCallback(
    (id: string, draft: ProjectDraft) => {
      setProjects((previous) => {
        const target = previous.find((project) => project.id === id);
        if (!target) return previous;
        updateProjectRow(createClient(), id, draft).catch(reportWriteError);
        return previous.map((project) =>
          project.id === id
            ? { ...project, name: draft.name.trim(), description: draft.description.trim() }
            : project,
        );
      });
    },
    [reportWriteError],
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((previous) => {
        const target = previous.find((project) => project.id === id);
        if (!target) return previous;
        // Оптимистично убираем проект и его задачи: каскад в базе сделает то же.
        setTasks((current) => current.filter((task) => task.projectId !== id));
        deleteProjectRow(createClient(), id).catch(reportWriteError);
        return previous.filter((project) => project.id !== id);
      });
    },
    [reportWriteError],
  );

  const addTask = useCallback(
    (draft: TaskDraft) => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: draft.title.trim(),
        projectId: draft.projectId,
        deadline: draft.deadline || null,
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      setTasks((previous) => [task, ...previous]);
      createTask(createClient(), draft, task.id, task.createdAt).catch(reportWriteError);
      return task;
    },
    [reportWriteError],
  );

  const updateTask = useCallback(
    (id: string, draft: TaskDraft) => {
      setTasks((previous) => {
        const target = previous.find((task) => task.id === id);
        if (!target) return previous;
        updateTaskRow(createClient(), id, draft).catch(reportWriteError);
        return previous.map((task) =>
          task.id === id
            ? { ...task, title: draft.title.trim(), projectId: draft.projectId, deadline: draft.deadline || null }
            : task,
        );
      });
    },
    [reportWriteError],
  );

  const toggleTask = useCallback(
    (id: string) => {
      setTasks((previous) => {
        const target = previous.find((task) => task.id === id);
        if (!target) return previous;
        const done = !target.done;
        setTaskDone(createClient(), id, done).catch(reportWriteError);
        return previous.map((task) =>
          task.id === id
            ? {
                ...task,
                done,
                completedAt: done ? new Date().toISOString() : null,
              }
            : task,
        );
      });
    },
    [reportWriteError],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((previous) => {
        const target = previous.find((task) => task.id === id);
        if (!target) return previous;
        deleteTaskRow(createClient(), id).catch(reportWriteError);
        return previous.filter((task) => task.id !== id);
      });
    },
    [reportWriteError],
  );

  // Витрина для показа: заменяет содержимое целиком, поэтому одна операция в базе.
  const resetDemoData = useCallback(() => {
    const seed = createSeedData();
    setProjects(seed.projects);
    setTasks(seed.tasks);
    replaceAllUserData(createClient(), seed.projects, seed.tasks).catch(reportWriteError);
  }, [reportWriteError]);

  const clearAllData = useCallback(() => {
    setProjects([]);
    setTasks([]);
    deleteAllUserData(createClient()).catch(reportWriteError);
  }, [reportWriteError]);

  const value = useMemo<AppStore>(
    () => ({
      user,
      projects: visibleProjects,
      tasks: visibleTasks,
      isReady,
      needsDisplayName,
      dataError,
      requestMagicLink,
      saveDisplayName,
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
      visibleProjects,
      visibleTasks,
      isReady,
      needsDisplayName,
      dataError,
      requestMagicLink,
      saveDisplayName,
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

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useAppStore должен вызываться внутри <AppStoreProvider>");
  }
  return store;
}
