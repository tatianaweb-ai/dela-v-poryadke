"use client";

import { AppShell } from "@/components/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { AppStoreProvider, useAppStore } from "@/context/AppStore";

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
        <p className="text-sm text-slate-500">Загружаем ваши данные…</p>
      </div>
    </div>
  );
}

/**
 * Пока LocalStorage не прочитан, показываем заглушку. На сервере и во время гидрации
 * `isReady` равен `false`, поэтому разметка совпадает и ошибок гидрации не возникает.
 */
function StoreGate() {
  const { isReady } = useAppStore();

  if (!isReady) return <Splash />;

  return <AppShell />;
}

export function Providers() {
  return (
    <AppStoreProvider>
      <ToastProvider>
        <StoreGate />
      </ToastProvider>
    </AppStoreProvider>
  );
}
