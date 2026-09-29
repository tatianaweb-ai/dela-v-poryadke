import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Секреты для входа по ссылке.
 *
 * Токен — 32 случайных байта в base64url (256 бит энтропии, перебор бессмыслен).
 * В базу кладётся только SHA-256: утечка дампа базы не даёт войти в аккаунты,
 * потому что исходный токен восстановить нельзя, а в ссылке в письме он уже есть.
 */
const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Сравнение хешей без утечки времени — пригодится при проверке Origin и CSRF-токенов. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Приводит адрес к каноничному виду: без пробелов, в нижнем регистре. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
