"use client";

import { Eye, EyeOff, ListChecks } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppStore } from "@/context/AppStore";
import { looksLikeEmail, MIN_PASSWORD_LENGTH, type AuthMode } from "@/lib/supabase/auth";

export function AuthScreen() {
  const { signIn, authNotice } = useAppStore();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword("");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!looksLikeEmail(trimmed)) {
      setError("Введите почту, например anna@example.com");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }

    setError(null);
    setPending(true);

    const result = await signIn(trimmed, password, mode);
    // Успех означает, что сессия уже есть: экран сменится сам.
    if (!result.ok) {
      setError(result.error ?? "Не получилось войти. Попробуйте ещё раз.");
      setPending(false);
    }
  };

  const notice = error ?? authNotice;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
            <ListChecks className="size-7" />
          </span>
          <Logo className="text-2xl" />
          <p className="mt-2 text-sm text-slate-500">
            Проекты, задачи и дедлайны — в одном месте
          </p>
        </div>

        {notice && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
          >
            {notice}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <Field label="Электронная почта" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="anna@example.com"
              value={email}
              disabled={pending}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <Field
            label="Пароль"
            htmlFor="password"
            required
            hint={mode === "sign-up" ? `Минимум ${MIN_PASSWORD_LENGTH} символов` : undefined}
          >
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={revealed ? "text" : "password"}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                placeholder="••••••"
                className="pr-11"
                value={password}
                disabled={pending}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError(null);
                }}
              />
              <button
                type="button"
                aria-label={revealed ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setRevealed((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Button type="submit" fullWidth disabled={pending}>
            {pending
              ? mode === "sign-up"
                ? "Создаём аккаунт…"
                : "Входим…"
              : mode === "sign-up"
                ? "Создать аккаунт"
                : "Войти"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "sign-in" ? "Ещё нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button
            type="button"
            disabled={pending}
            onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="font-medium text-indigo-600 transition-colors hover:text-indigo-500 disabled:opacity-50"
          >
            {mode === "sign-in" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>

        <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
          {mode === "sign-in"
            ? "Один пароль — входите с любого устройства."
            : "Аккаунт привязан к почте, данные хранятся в облаке."}
        </p>
      </div>
    </main>
  );
}
