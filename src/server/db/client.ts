import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const PGLITE_DIR = path.join(process.cwd(), ".pglite");

declare global {
  /**
   * В dev сервер перезагружает модули при каждом правке файла, а подключение
   * должно остаться одно — иначе копим пул соединений до конца сессии.
   */
  var __dvpDb: Db | undefined;
  var __dvpSql: ReturnType<typeof postgres> | undefined;
  var __dvpReady: Promise<Db> | undefined;
  var __dvpPglite: { close: () => Promise<void> } | undefined;
}

async function openPostgres(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан");

  // prepare: false — Supabase и Railway часто проксируют через PgBouncer,
  // где prepared statements не поддерживаются.
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
    prepare: false,
  });
  globalThis.__dvpSql = client;

  const db = drizzlePostgres(client, { schema });
  // Миграции идемпотентны: drizzle-kit ведёт таблицу __drizzle_migrations,
  // поэтому запуск при каждом старте безопасен. На Railway можно отключить
  // через RUN_MIGRATIONS=false и накатывать миграции отдельным шагом.
  if (process.env.RUN_MIGRATIONS !== "false") {
    await migratePostgres(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  }
  return db;
}

async function openPglite(): Promise<Db> {
  if (!existsSync(PGLITE_DIR)) mkdirSync(PGLITE_DIR, { recursive: true });

  // Динамический импорт: на Railway переменная DATABASE_URL всегда есть,
  // и PGlite в бандл не тащится.
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(PGLITE_DIR);
  globalThis.__dvpPglite = client;

  const pgliteDb = drizzlePglite(client, { schema });
  await migratePglite(pgliteDb, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return pgliteDb as unknown as Db;
}

export function usingLocalDatabase(): boolean {
  return !process.env.DATABASE_URL;
}

/** Подключение к базе. Первый вызов применяет миграции, дальше возвращает тот же инстанс. */
export function getDb(): Promise<Db> {
  if (globalThis.__dvpDb) return Promise.resolve(globalThis.__dvpDb);

  globalThis.__dvpReady ??= (process.env.DATABASE_URL ? openPostgres() : openPglite())
    .then((db) => {
      globalThis.__dvpDb = db;
      return db;
    })
    .catch((error: unknown) => {
      // Не кэшируем неудачу, иначе после починки окружения процесс не восстановится.
      globalThis.__dvpReady = undefined;
      throw error;
    });

  return globalThis.__dvpReady;
}

/** Только для тестов и горячих перезапусков. */
export async function closeDb(): Promise<void> {
  await globalThis.__dvpPglite?.close();
  await globalThis.__dvpSql?.end({ timeout: 5 });
  globalThis.__dvpDb = undefined;
  globalThis.__dvpReady = undefined;
  globalThis.__dvpSql = undefined;
  globalThis.__dvpPglite = undefined;
}
