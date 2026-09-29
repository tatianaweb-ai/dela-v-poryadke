"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Setter<T> = T | ((previous: T) => T);

/** Маркер отсутствующего или повреждённого значения в хранилище. */
const ABSENT = Symbol("dvp:absent");
type Snapshot<T> = T | typeof ABSENT;

/**
 * Модульный кэш разобранных значений.
 * `useSyncExternalStore` сравнивает снапшоты через `Object.is`, поэтому каждый ключ
 * обязан возвращать одну и ту же ссылку до следующей записи.
 */
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();
/** Ключи с нечитаемым значением: их нужно вычистить из хранилища после рендера. */
const damaged = new Set<string>();
let storageBound = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function bindStorageEvent(): void {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;

  window.addEventListener("storage", (event) => {
    // `event.key === null` означает очистку всего хранилища.
    if (event.key === null) {
      cache.clear();
      damaged.clear();
    } else {
      cache.delete(event.key);
      damaged.delete(event.key);
    }
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  bindStorageEvent();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function defaultDeserialize<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

/** Стабильная константа, чтобы серверный снапшот всегда совпадал по `Object.is`. */
function getServerSnapshot<T>(): Snapshot<T> {
  return ABSENT;
}

function readSnapshot<T>(key: string, deserialize: (raw: string) => T): Snapshot<T> {
  if (!cache.has(key)) {
    if (typeof window === "undefined") return ABSENT;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch (error) {
      console.warn(`[useLocalStorage] Не удалось прочитать ключ "${key}"`, error);
      return ABSENT;
    }

    if (raw === null) {
      cache.set(key, ABSENT);
      return ABSENT;
    }

    try {
      const parsed = deserialize(raw);
      cache.set(key, parsed);
      return parsed;
    } catch {
      console.warn(
        `[useLocalStorage] Значение по ключу "${key}" повреждено, ключ будет удалён`,
      );
      damaged.add(key);
      cache.set(key, ABSENT);
      return ABSENT;
    }
  }

  return cache.get(key) as Snapshot<T>;
}

function writeSnapshot<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    damaged.delete(key);
  } catch (error) {
    console.warn(`[useLocalStorage] Не удалось сохранить значение по ключу "${key}"`, error);
  }

  cache.set(key, value);
  emit();
}

export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (next: Setter<T>) => void;
  /** `false` во время серверного рендера и первого клиентского рендера. */
  isReady: boolean;
  remove: () => void;
  reload: () => void;
}

/**
 * SSR-безопасная обёртка над `localStorage` поверх `useSyncExternalStore`.
 *
 * Сервер и гидратация всегда получают `initialValue`, поэтому разметка совпадает
 * и ошибок гидратации нет. Реальные данные подставляются сразу после монтирования —
 * об этом сообщает флаг `isReady`.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  deserialize: (raw: string) => T = defaultDeserialize,
): UseLocalStorageResult<T> {
  const getSnapshot = useCallback(() => readSnapshot<T>(key, deserialize), [key, deserialize]);

  // Клиентский снапшот читает localStorage, серверный — всегда «данных ещё нет».
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReady = useSyncExternalStore(subscribe, () => true, () => false);

  const value: T = (stored as Snapshot<T>) === ABSENT ? initialValue : (stored as T);

  const setValue = useCallback(
    (next: Setter<T>) => {
      const current = getSnapshot();
      const base: T = current === ABSENT ? initialValue : current;
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(base) : next;

      writeSnapshot(key, resolved);
    },
    [getSnapshot, key, initialValue],
  );

  const remove = useCallback(() => {
    damaged.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[useLocalStorage] Не удалось удалить ключ "${key}"`, error);
    }
    cache.set(key, ABSENT);
    emit();
  }, [key]);

  // Повреждённое значение нельзя оставлять в хранилище: иначе оно будет бить
  // ошибкой при каждой загрузке, пока пользователь не очистит данные вручную.
  useEffect(() => {
    if (damaged.has(key)) remove();
  }, [key, remove]);

  const reload = useCallback(() => {
    cache.delete(key);
    emit();
  }, [key]);

  return { value, setValue, isReady, remove, reload };
}
