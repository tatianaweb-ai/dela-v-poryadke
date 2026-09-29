"use client";

import { LayoutGrid, ListTodo, LogOut, FolderKanban } from "lucide-react";

import { Logo } from "@/components/Logo";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/context/AppStore";
import { cn } from "@/lib/cn";
import type { ViewTab } from "@/types";

const TABS: { id: ViewTab; label: string; shortLabel: string; icon: typeof LayoutGrid }[] = [
  { id: "dashboard", label: "Обзор", shortLabel: "Обзор", icon: LayoutGrid },
  { id: "tasks", label: "Задачи", shortLabel: "Задачи", icon: ListTodo },
  { id: "projects", label: "Проекты", shortLabel: "Проекты", icon: FolderKanban },
];

export function Header({ activeTab, onTabChange }: { activeTab: ViewTab; onTabChange: (tab: ViewTab) => void }) {
  const { user, tasks, signOut } = useAppStore();
  const toast = useToast();

  const activeTasks = tasks.filter((task) => !task.done).length;

  const handleSignOut = () => {
    signOut();
    toast.info("Вы вышли из приложения");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo className="shrink-0" />

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {user.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="max-w-32 truncate text-sm font-medium text-slate-700">{user.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Выйти"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>

      <nav className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl gap-1 px-2 sm:px-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === "tasks" && activeTasks > 0 ? activeTasks : null;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {badge !== null && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {badge}
                  </span>
                )}
                <span
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                    isActive ? "bg-indigo-600" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
