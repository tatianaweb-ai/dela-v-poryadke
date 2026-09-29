import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Обновление сессии на каждом запросе.
 *
 * Supabase хранит токены в httpOnly cookie, у которых есть срок. Без этого файла
 * cookie не продлевается, и пользователя рано или поздно выбросило бы из входа.
 * Здесь же обновлённые cookie переносятся в ответ — из Server Component их
 * изменить нельзя, только здесь.
 *
 * В Next.js 16 этот файл называется proxy.ts (раньше middleware.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser(), а не getSession(): он обращается к Supabase и проверяет токен
  // по-настоящему, тогда как getSession() доверяет содержимому cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
