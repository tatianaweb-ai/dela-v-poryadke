"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/context/AppStore";
import { MIN_PASSWORD_LENGTH } from "@/lib/supabase/auth";

/**
 * Экран после перехода по ссылке «сбросить пароль» из письма.
 *
 * Сессия в этот момент уже есть, поэтому показать обычное приложение нельзя:
 * человек пришёл именно за новым паролем.
 */
export function ResetPasswordScreen() {
  const { setNewPassword, signOut } = useAppStore();
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (password !== repeat) {
      setError("Пароли не совпадают.");
      return;
    }

    setError(null);
    setPending(true);

    const result = await setNewPassword(password);
    if (!result.ok) {
      setError(result.error ?? "Не удалось сохранить пароль. Попробуйте ещё раз.");
      setPending(false);
      return;
    }

    toast.success("Пароль сохранён");
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
            <KeyRound className="size-7" />
          </span>
          <Logo className="text-2xl" />
          <p className="mt-2 text-sm text-slate-500">Задайте новый пароль</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <Field
            label="Новый пароль"
            htmlFor="new-password"
            required
            hint={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
          >
            <div className="relative">
              <Input
                id="new-password"
                name="new-password"
                type={revealed ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
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

          <Field label="Повторите пароль" htmlFor="repeat-password" required>
            <Input
              id="repeat-password"
              name="repeat-password"
              type={revealed ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••"
              value={repeat}
              disabled={pending}
              onChange={(event) => {
                setRepeat(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? "Сохраняем…" : "Сохранить пароль"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Не хотите менять пароль?{" "}
          <button
            type="button"
            disabled={pending}
            onClick={() => void signOut()}
            className="font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-700 disabled:opacity-50"
          >
            Выйти
          </button>
        </p>
      </div>
    </main>
  );
}
