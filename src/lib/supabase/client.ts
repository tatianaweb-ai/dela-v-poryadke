"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseConfig } from "./config";

/**
 * Клиент для браузера: вход по ссылке, выход, запрос своих данных.
 * Сессию он не хранит — она лежит в cookie и читается на сервере.
 */
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
