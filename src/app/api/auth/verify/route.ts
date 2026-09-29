import { NextResponse } from "next/server";

import { consumeLoginToken, purgeStaleLoginData } from "@/server/auth/login-link";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { clientIp, userAgent } from "@/server/http";

/** Явный 303: после GET никаких других методов продолжать не нужно. */
const REDIRECT_AFTER_SIGN_IN = 303;

/**
 * Вход по ссылке из письма. Ссылку открывают как обычную навигацию (GET),
 * поэтому здесь ставим cookie и уводим в приложение.
 *
 * Ошибка всегда одна и та же, чтобы по ней нельзя было отличить
 * несуществующий токен от уже использованного или просроченного.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const home = new URL("/", request.url);

  if (!token || token.length > 200) {
    return NextResponse.redirect(home, REDIRECT_AFTER_SIGN_IN);
  }

  const result = await consumeLoginToken(token);

  if (!result.ok) {
    console.warn(`[auth] ссылка не сработала: ${result.reason}`);
    return NextResponse.redirect(new URL("/?auth=invalid", home), REDIRECT_AFTER_SIGN_IN);
  }

  const sessionToken = await createSession(result.userId, {
    userAgent: userAgent(request),
    ip: clientIp(request),
  });
  await setSessionCookie(sessionToken);
  await purgeStaleLoginData();

  return NextResponse.redirect(new URL("/?auth=ok", home), REDIRECT_AFTER_SIGN_IN);
}
