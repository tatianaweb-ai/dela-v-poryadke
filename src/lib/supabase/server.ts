import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseConfig } from "./config";

/**
 * Клиент для сервера и серверных компонентов.
 *
 * Ключевое отличие от обычного: сюда передаются getAll и setAll для cookie.
 * Supabase кладёт токены в cookie с флагом httpOnly, поэтому вредоносный скрипт
 * на странице их не прочитает. Создавать клиент на каждый запрос — обязательное
 * условие: при перезапуске сервера Supabase предупреждает об этом в логе.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Вызывается из Server Component, где cookie менять нельзя.
          // Это ожидаемо: сессия обновится в middleware при следующем запросе.
        }
      },
    },
  });
}
