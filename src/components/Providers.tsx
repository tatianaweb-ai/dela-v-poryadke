"use client";

import { TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { AppStoreProvider, useAppStore } from "@/context/AppStore";

function Splash({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        {error ? (
          <>
            <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <TriangleAlert className="size-7" />
            </span>
            <p className="text-sm leading-relaxed text-slate-700">{error}</p>
            <Button type="button" onClick={onRetry}>
              Повторить
            </Button>
          </>
        ) : (
          <>
            <span className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Загружаем ваши данные…</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Пока сессия не проверена и данные не пришли, показываем заглушку. На сервере и
 * во время гидрации `isReady` равен `false`, поэтому разметка совпадает и ошибок
 * гидрации не возникает.
 *
 * Ошибку загрузки показываем здесь же: раньше она терялась, потому что при
 * `isReady === false` приложение ещё не отрисовано, и человек видел только
 * бесконечный кружок без объяснений.
 */
function StoreGate() {
  const { isReady, dataError, reloadData } = useAppStore();

  if (!isReady) return <Splash error={dataError} onRetry={reloadData} />;

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
