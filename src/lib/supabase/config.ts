/**
 * Доступ к переменным окружения Supabase.
 *
 * Значения живут в .env при локальной разработке и в настройках Railway при
 * публикации. Проверка выполняется в момент чтения, а не при сборке: иначе
 * проект собрался бы успешно и упал бы при первом обращении к базе.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function supabaseConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Не заданы NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Проверьте файл .env в корне проекта.",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
