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
  /** `false`, РїРѕРєР° РЅРµ РїСЂРѕС‡РёС‚Р°РЅС‹ РґР°РЅРЅС‹Рµ РёР· С…СЂР°РЅРёР»РёС‰Р° Рё РЅРµ РїСЂРѕРІРµСЂРµРЅР° СЃРµСЃСЃРёСЏ. */
  isReady: boolean;
  /** Р§РµР»РѕРІРµРє РІРѕС€С‘Р», РЅРѕ РµС‰С‘ РЅРµ РЅР°Р·РІР°Р» СЃРµР±СЏ вЂ” РїРѕРєР°Р·С‹РІР°РµРј СЌРєСЂР°РЅ СЃ РёРјРµРЅРµРј. */
  needsDisplayName: boolean;
  /** РўРµРєСЃС‚ РїРѕСЃР»РµРґРЅРµР№ РѕС€РёР±РєРё Р·Р°РїРёСЃРё РёР»Рё С‡С‚РµРЅРёСЏ; РёРЅС‚РµСЂС„РµР№СЃ СЃР°Рј РіР°СЃРёС‚ РµРіРѕ РїРѕ С‚Р°Р№РјРµСЂСѓ. */
  dataError: string | null;
  /** РџРѕРІС‚РѕСЂСЏРµС‚ Р·Р°РіСЂСѓР·РєСѓ РґР°РЅРЅС‹С…: РєРЅРѕРїРєР° В«РџРѕРІС‚РѕСЂРёС‚СЊВ» РЅР° Р·Р°РіР»СѓС€РєРµ. */
  reloadData: () => void;
  /** РџСЂРѕСЃРёС‚ Supabase РѕС‚РїСЂР°РІРёС‚СЊ СЃСЃС‹Р»РєСѓ РґР»СЏ РІС…РѕРґР°. */
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

/**
 * Ошибки Supabase — не экземпляры Error, а обычные объекты с полями
 * message/code/details. Проверка только через instanceof молча теряла бы текст
 * и подставляла «Неизвестная ошибка» именно там, где причина нужнее всего.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; code?: unknown };
    if (typeof candidate.message === "string" && candidate.message) return candidate.message;
    try {
      return JSON.stringify(error);
    } catch {
      return "неизвестный формат ошибки";
    }
  }
  return String(error);
}

const AppStoreContext = createContext<AppStore | null>(null);

/**
 * Р”РѕСЃС‚Р°С‘С‚ РёРјСЏ РёР· user_metadata. Р’РѕР·РІСЂР°С‰Р°РµС‚ null, РµСЃР»Рё РёРјСЏ РµС‰С‘ РЅРµ Р·Р°РґР°РЅРѕ РёР»Рё
 * СЃРѕРґРµСЂР¶РёС‚ РјСѓСЃРѕСЂ вЂ” С‚РѕРіРґР° РїСЂРёР»РѕР¶РµРЅРёРµ РїРѕРїСЂРѕСЃРёС‚ РµРіРѕ РІРІРµСЃС‚Рё.
 */
function readDisplayName(user: SupabaseUser | null): string | null {
  const raw = user?.user_metadata?.display_name;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length >= MIN_DISPLAY_NAME_LENGTH && trimmed.length <= MAX_DISPLAY_NAME_LENGTH
    ? trimmed
    : null;
}

/** РЎС‚Р°Р±РёР»СЊРЅС‹Рµ СЃСЃС‹Р»РєРё РЅСѓР¶РЅС‹, С‡С‚РѕР±С‹ `initialValue` РЅРµ РјРµРЅСЏР» РёРґРµРЅС‚РёС‡РЅРѕСЃС‚СЊ РЅР° РєР°Р¶РґРѕРј СЂРµРЅРґРµСЂРµ. */
const NO_PROJECTS: Project[] = [];
const NO_TASKS: Task[] = [];

export function AppStoreProvider({ children }: { children: ReactNode }) {
  // РљС‚Рѕ РІРѕС€С‘Р» вЂ” РѕРїСЂРµРґРµР»СЏРµС‚ Supabase, Р° РЅРµ Р»РѕРєР°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ: РёРЅР°С‡Рµ Р»СЋР±РѕР№ РјРѕРі Р±С‹
  // РґРѕРїРёСЃР°С‚СЊ РІ Р±СЂР°СѓР·РµСЂРµ "dvp:user" Рё РёР·РѕР±СЂР°Р·РёС‚СЊ РІС…РѕРґ.
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
      // РџРѕСЃР»Рµ РєР»РёРєР° РїРѕ СЃСЃС‹Р»РєРµ РёР· РїРёСЃСЊРјР° Р±СЂР°СѓР·РµСЂ РІРµСЂРЅС‘С‚СЃСЏ РЅР° РіР»Р°РІРЅСѓСЋ.
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

  // Р”Р°РЅРЅС‹Рµ Р¶РёРІСѓС‚ РІ Р±Р°Р·Рµ Рё РїСЂРёС…РѕРґСЏС‚ РІРјРµСЃС‚Рµ СЃ СЃРµСЃСЃРёРµР№. РџРѕРєР° СЃРµСЃСЃРёРё РЅРµС‚ вЂ” РїСѓСЃС‚С‹Рµ
  // РјР°СЃСЃРёРІС‹ Рё isReady === false, С‡С‚РѕР±С‹ РёРЅС‚РµСЂС„РµР№СЃ РЅРµ РјРёРіРЅСѓР» РґРµРјРѕ-РґР°РЅРЅС‹РјРё.
  const [projects, setProjects] = useState<Project[]>(NO_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(NO_TASKS);

  // Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ Рё РѕС€РёР±РєР° РїСЂРёРІСЏР·Р°РЅС‹ Рє РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ: РЅРµ РЅСѓР¶РЅРѕ СЃР±СЂР°СЃС‹РІР°С‚СЊ РёС… РІ
  // СЌС„С„РµРєС‚Рµ, РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїРѕРјРµС‚РёС‚СЊ, РґР»СЏ РєРѕРіРѕ РѕРЅРё Р°РєС‚СѓР°Р»СЊРЅС‹.
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ userId: string; message: string } | null>(null);

  const userId = authUser?.id ?? null;
  const userIdRef = useRef<string | null>(null);

  // Ref РЅСѓР¶РµРЅ, С‡С‚РѕР±С‹ РѕР±СЂР°Р±РѕС‚С‡РёРєРё Р·Р°РїРёСЃРё Р·РЅР°Р»Рё, РєРѕРјСѓ РїСЂРёРЅР°РґР»РµР¶РёС‚ РѕС€РёР±РєР°,
  // РЅРµ РјРµРЅСЏСЏ СЃРІРѕСЋ РёРґРµРЅС‚РёС‡РЅРѕСЃС‚СЊ (РёРЅР°С‡Рµ РїРµСЂРµР·Р°РіСЂСѓР¶Р°Р»СЃСЏ Р±С‹ СЌС„С„РµРєС‚ РІС‹С€Рµ).
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // РћС€РёР±РєР° Р·Р°РїРёСЃРё РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ РѕРґРёРЅ СЂР°Р·, РєР°Рє РІСЃРїР»С‹РІР°С€РєР°, Рё РЅРµ Р±Р»РѕРєРёСЂСѓРµС‚ СЂР°Р±РѕС‚Сѓ.
  const reportWriteError = useCallback((error: unknown) => {
    const owner = userIdRef.current;
    if (!owner) return;
    const message = errorMessage(error);
    // В консоль браузера: всплывашка живёт несколько секунд, а причина нужна
    // в логе сервера, где её можно прочитать целиком.
    console.error("[db] не удалось сохранить:", message, error);
    setLoadError({ userId: owner, message: `Не удалось сохранить: ${message}` });
  }, []);

  const dataError = loadError && loadError.userId === userId ? loadError.message : null;

  // РџРѕРІС‚РѕСЂ Р·Р°РіСЂСѓР·РєРё: СѓРІРµР»РёС‡РёРІР°РµРј СЃС‡С‘С‚С‡РёРє, Рё СЌС„С„РµРєС‚ РЅРёР¶Рµ РѕС‚СЂР°Р±РѕС‚Р°РµС‚ Р·Р°РЅРѕРІРѕ.
  const [reloadNonce, setReloadNonce] = useState(0);
  const reloadData = useCallback(() => setReloadNonce((value) => value + 1), []);

  useEffect(() => {
    // Р‘РµР· РІС…РѕРґР° Р·Р°РіСЂСѓР¶Р°С‚СЊ РЅРµС‡РµРіРѕ: РЅР°СЂСѓР¶Сѓ РґР°РЅРЅС‹Рµ РІСЃС‘ СЂР°РІРЅРѕ РЅРµ РѕС‚РґР°СЋС‚СЃСЏ
    // (СЃРј. visibleProjects/visibleTasks РЅРёР¶Рµ).
    if (!userId) return;

    const supabase = createClient();
    let active = true;

    (async () => {
      try {
        // Р‘РµР· РїСЂРµРґРµР»Р° РѕР¶РёРґР°РЅРёСЏ В«Р·Р°РІРёСЃС€Р°СЏВ» СЃРµС‚СЊ РІС‹РіР»СЏРґРµР»Р° Р±С‹ РІРµС‡РЅРѕР№ Р·Р°РіСЂСѓР·РєРѕР№.
        // Р›СѓС‡С€Рµ С‡РµСЃС‚РЅР°СЏ РѕС€РёР±РєР°, РєРѕС‚РѕСЂСѓСЋ РјРѕР¶РЅРѕ РїРѕРІС‚РѕСЂРёС‚СЊ.
        const timeout = new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error("РџСЂРµРІС‹С€РµРЅРѕ РІСЂРµРјСЏ РѕР¶РёРґР°РЅРёСЏ")), 15000);
        });
        const [loadedProjects, loadedTasks] = await Promise.race([
          Promise.all([fetchProjects(supabase), fetchTasks(supabase)]),
          timeout,
        ]);
        if (!active) return;

        // Р‘Р°Р·Р° РїСѓСЃС‚Р° вЂ” Р·РЅР°С‡РёС‚ СЌС‚Рѕ РїРµСЂРІС‹Р№ РІС…РѕРґ. РџРѕРєР°Р·С‹РІР°РµРј РІРёС‚СЂРёРЅСѓ РґР»СЏ РґРµРјРѕ.
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
          message: "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ. РџСЂРѕРІРµСЂСЊС‚Рµ СЃРѕРµРґРёРЅРµРЅРёРµ Рё РѕР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, reportWriteError, reloadNonce]);

  // РРјСЏ Р¶РёРІС‘С‚ РІ user_metadata: РёР·РјРµРЅСЏРµС‚ РµРіРѕ С‚РѕР»СЊРєРѕ РІР»Р°РґРµР»РµС† СЃРІРѕРµР№ СЃРµСЃСЃРёРё,
  // РёР· РєРѕРґР° РїСЂРёР»РѕР¶РµРЅРёСЏ вЂ” РЅРёРєР°Рє.
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

  // РџРѕРєР° РЅРµС‚ РІС…РѕРґР°, РЅР°СЂСѓР¶Сѓ РЅРµ РѕС‚РґР°С‘Рј РЅРёС‡РµРіРѕ: С‡СѓР¶РёРµ РґР°РЅРЅС‹Рµ РЅРµ РґРѕР»Р¶РЅС‹ РјРёРіРЅСѓС‚СЊ
  // РІ РёРЅС‚РµСЂС„РµР№СЃРµ РЅРё РЅР° РѕРґРЅРѕРј РєР°РґСЂРµ вЂ” РґР°Р¶Рµ РµСЃР»Рё СЃРјРµРЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Р±С‹СЃС‚СЂР°СЏ.
  const visibleProjects = userId ? projects : NO_PROJECTS;
  const visibleTasks = userId ? tasks : NO_TASKS;

  /**
   * РћРїС‚РёРјРёСЃС‚РёС‡РЅРѕРµ РѕР±РЅРѕРІР»РµРЅРёРµ: СЃРЅР°С‡Р°Р»Р° РјРµРЅСЏРµРј Р»РѕРєР°Р»СЊРЅРѕРµ СЃРѕСЃС‚РѕСЏРЅРёРµ (РёРЅС‚РµСЂС„РµР№СЃ
   * СЂРµР°РіРёСЂСѓРµС‚ РјРіРЅРѕРІРµРЅРЅРѕ), Р·Р°С‚РµРј РїРёС€РµРј РІ Р±Р°Р·Сѓ. РџСЂРё РѕС‚РєР°Р·Рµ Р±Р°Р·С‹ РІРѕР·РІСЂР°С‰Р°РµРј
   * РїСЂРµР¶РЅРµРµ Р·РЅР°С‡РµРЅРёРµ вЂ” РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРёРґРёС‚, С‡С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµ СѓРґР°Р»РѕСЃСЊ.
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
        // РћРїС‚РёРјРёСЃС‚РёС‡РЅРѕ СѓР±РёСЂР°РµРј РїСЂРѕРµРєС‚ Рё РµРіРѕ Р·Р°РґР°С‡Рё: РєР°СЃРєР°Рґ РІ Р±Р°Р·Рµ СЃРґРµР»Р°РµС‚ С‚Рѕ Р¶Рµ.
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

  // Р’РёС‚СЂРёРЅР° РґР»СЏ РїРѕРєР°Р·Р°: Р·Р°РјРµРЅСЏРµС‚ СЃРѕРґРµСЂР¶РёРјРѕРµ С†РµР»РёРєРѕРј, РїРѕСЌС‚РѕРјСѓ РѕРґРЅР° РѕРїРµСЂР°С†РёСЏ РІ Р±Р°Р·Рµ.
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
      reloadData,
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
      reloadData,
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
    throw new Error("useAppStore РґРѕР»Р¶РµРЅ РІС‹Р·С‹РІР°С‚СЊСЃСЏ РІРЅСѓС‚СЂРё <AppStoreProvider>");
  }
  return store;
}
