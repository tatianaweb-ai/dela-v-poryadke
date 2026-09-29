import "server-only";

import { NextResponse } from "next/server";

/**
 * Защита от cross-site запросов.
 *
 * Cookie ставится с SameSite=Lax, но это защита первого уровня: Lax не мешает
 * обычной навигации, поэтому сверяем Origin с хостом сами. Разница между
 * "запрос от нашей страницы" и "запрос со стороннего сайта" — ровно то, что
 * нужно, чтобы вредоносный сайт не смог от имени пользователя создать проект.
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Некоторые клиенты не шлют Origin. Referer слабее (его легче подделать),
  // но лучше, чем ничего.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // И Origin, и Referer отсутствуют — отклоняем: браузер с cookie их пришлёт.
  return false;
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? null;
}

export function userAgent(request: Request): string | null {
  return request.headers.get("user-agent") ?? null;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
