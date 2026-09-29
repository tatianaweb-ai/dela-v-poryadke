import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { generateToken, hashToken } from "./crypto";

export const SESSION_COOKIE = "dvp_session";
export const SESSION_TTL_DAYS = 30;

export type SessionUser = { id: string; email: string; name: string | null };

/**
 * Сессия живёт 30 дней. Cookie ставится с httpOnly: JavaScript приложения
 * (в том числе XSS-скрипт) до неё не дотянется, утечка токена из браузера
 * исключена. SameSite=Lax не даёт отправлять её вредоносным сайтом,
 * но разрешает выставить при переходе по ссылке из письма.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

/** Создаёт сессию. В БУ уходит хеш, сам токен возвращается для установки в cookie. */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<string> {
  const db = await getDb();
  const token = generateToken();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString(),
    lastSeenAt: new Date().toISOString(),
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

/** Обновляем lastSeen не чаще раза в сутки, чтобы чтение не превращалось в запись. */
const TOUCH_INTERVAL_MS = 86_400_000;

/**
 * Текущий пользователь по cookie. Сессия, которая истекла, удаляется на месте,
 * чтобы база не копила мусор. Возвращает null для гостя.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();

  const [row] = await db
    .select({
      sessionId: sessions.id,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, nowIso)))
    .limit(1);

  if (!row) return null;

  // Сессия, созданная без отметки времени (или с пустой), считается давно не использованной.
  const lastSeen = row.lastSeenAt ? new Date(row.lastSeenAt).getTime() : 0;
  if (Date.now() - lastSeen > TOUCH_INTERVAL_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: nowIso })
      .where(eq(sessions.id, row.sessionId));
  }

  return { id: row.id, email: row.email, name: row.name };
}

/** Завершает текущую сессию. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
