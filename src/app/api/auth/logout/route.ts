import { NextResponse } from "next/server";

import { clearSessionCookie, destroySession } from "@/server/auth/session";
import { isSameOrigin, jsonError } from "@/server/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("Запрос отклонён", 403);
  }

  await destroySession();
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}

export function GET() {
  return jsonError("Метод не поддерживается", 405);
}
