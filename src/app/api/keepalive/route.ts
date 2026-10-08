import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Ежедневный «пинг» к базе.
 *
 * Бесплатный тариф Supabase ставит проект на паузу после недели без запросов
 * к базе — с приложением, которое открывают раз в месяц, это случается
 * регулярно. Запрос к таблице идёт в Postgres даже без входа: RLS вернёт
 * пустой результат, но активность будет засчитана.
 *
 * Вызывается из GitHub Actions раз в сутки (см. .github/workflows/keepalive.yml).
 */
// Всегда выполняем в момент запроса: при сборке ходить в базу нельзя.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { url, key } = supabaseConfig();
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { error } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("[keepalive] запрос к базе не прошёл:", error.message);
      return NextResponse.json({ ok: false, reason: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[keepalive]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
