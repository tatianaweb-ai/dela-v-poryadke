import "server-only";

import { and, eq, gt, isNotNull, isNull, lt, lte, or } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { loginAttempts, loginTokens, users } from "@/server/db/schema";
import { generateToken, hashToken, normalizeEmail } from "./crypto";

/** Ссылка для входа живёт 15 минут — достаточно, чтобы открыть письмо на телефоне. */
export const LOGIN_TOKEN_TTL_MINUTES = 15;

/** Не больше 3 запроса ссылок на один адрес в час и 10 на один IP. */
export const EMAIL_RATE_LIMIT = { max: 3, windowMinutes: 60 } as const;
export const IP_RATE_LIMIT = { max: 10, windowMinutes: 60 } as const;

export type IssueResult =
  | { ok: true; token: string; email: string }
  | { ok: false; reason: "rate_limited"; email: string };

async function countAttempts(
  column: typeof loginAttempts.email | typeof loginAttempts.ip,
  value: string,
  sinceIso: string,
): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ value: column })
    .from(loginAttempts)
    .where(and(eq(column, value), gt(loginAttempts.createdAt, sinceIso)));
  return rows.length;
}

/**
 * Проверяет лимиты и записывает попытку. Запись идёт и при отказе: повторные
 * попытки продлевают блокировку, поэтому перебор не окупается.
 * Считаем по журналу попыток, а не по login_tokens — токены при повторном
 * запросе инвалидируются, и счётчик по ним всегда был бы нулевым.
 */
export async function registerAttempt(
  email: string,
  ip: string | null,
): Promise<{ limited: boolean }> {
  const db = await getDb();
  const now = Date.now();
  const emailWindow = new Date(now - EMAIL_RATE_LIMIT.windowMinutes * 60_000).toISOString();
  const ipWindow = new Date(now - IP_RATE_LIMIT.windowMinutes * 60_000).toISOString();

  // Окно шире часа: за это время все строки вне окна больше не влияют на счёт.
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, ipWindow));

  const [byEmail, byIp] = await Promise.all([
    countAttempts(loginAttempts.email, email, emailWindow),
    ip ? countAttempts(loginAttempts.ip, ip, ipWindow) : Promise.resolve(0),
  ]);

  const limited =
    byEmail >= EMAIL_RATE_LIMIT.max || (ip !== null && byIp >= IP_RATE_LIMIT.max);

  await db.insert(loginAttempts).values({ email, ip });

  return { limited };
}

/**
 * Выдаёт токен входа. Возвращает сам токентолько вызывающему коду —
 * он уходит в письмо и больше нигде не сохраняется.
 */
export async function issueLoginToken(email: string, ip: string | null): Promise<IssueResult> {
  const normalized = normalizeEmail(email);

  const { limited } = await registerAttempt(normalized, ip);
  if (limited) {
    return { ok: false, reason: "rate_limited", email: normalized };
  }

  const db = await getDb();
  const token = generateToken();

  // Старые токены этого адреса больше не действительны — иначе по ссылке
  // из предыдущего письма можно было бы войти после нового запроса.
  const nowIso = new Date().toISOString();
  await db
    .delete(loginTokens)
    .where(
      or(
        lt(loginTokens.expiresAt, nowIso),
        isNotNull(loginTokens.usedAt),
        eq(loginTokens.email, normalized),
      ),
    );

  await db.insert(loginTokens).values({
    email: normalized,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MINUTES * 60_000).toISOString(),
    ip,
  });

  return { ok: true, token, email: normalized };
}

export type ConsumeResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Проверяет токен и создаёт пользователя, если его ещё нет.
 * Регистрация и вход — одна операция: пароля нет, подтверждать адрес нечем.
 */
export async function consumeLoginToken(token: string): Promise<ConsumeResult> {
  const db = await getDb();
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();

  const [record] = await db
    .select()
    .from(loginTokens)
    .where(eq(loginTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Помечаем использованным в том же запросе, что и проверку: повторное
  // открытие ссылки параллельно не должно выдать две сессии.
  const claimed = await db
    .update(loginTokens)
    .set({ usedAt: nowIso })
    .where(and(eq(loginTokens.tokenHash, tokenHash), isNull(loginTokens.usedAt)))
    .returning({ id: loginTokens.id });

  if (claimed.length === 0) return { ok: false, reason: "used" };

  const [user] = await db
    .insert(users)
    .values({ email: record.email })
    .onConflictDoUpdate({
      target: users.email,
      set: { email: record.email },
    })
    .returning();

  return { ok: true, userId: user.id, email: user.email };
}

/** Удаляет токены, которые истекли или были использованы, и старые попытки входа. */
export async function purgeStaleLoginData(): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const windowAgo = new Date(Date.now() - IP_RATE_LIMIT.windowMinutes * 60_000).toISOString();

  await db.delete(loginTokens).where(lte(loginTokens.expiresAt, nowIso));
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, windowAgo));
}
