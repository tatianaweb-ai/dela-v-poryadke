"use client";

import { ListChecks } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppStore } from "@/context/AppStore";
import { MAX_DISPLAY_NAME_LENGTH, MIN_DISPLAY_NAME_LENGTH } from "@/lib/supabase/auth";

/**
 * Спрашиваем имя один раз, после первого входа. Вход при этом остаётся по
 * ссылке из письма: имя нужно только для приветствия в шапке.
 */
export function NameSetupScreen() {
  const { saveDisplayName } = useAppStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < MIN_DISPLAY_NAME_LENGTH) {
      setError(`Введите имя — минимум ${MIN_DISPLAY_NAME_LENGTH} символа`);
      return;
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      setError(`Имя не должно быть длиннее ${MAX_DISPLAY_NAME_LENGTH} символов`);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await saveDisplayName(trimmed);
    } catch {
      setError("Не удалось сохранить имя. Попробуйте ещё раз.");
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
            <ListChecks className="size-7" />
          </span>
          <Logo className="text-2xl" />
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Как к вам обращаться?
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Имя увидите только вы. Мы никуда его не отправляем.
            </p>
          </div>

          <Field label="Ваше имя" htmlFor="displayName" error={error ?? undefined} required>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              autoFocus
              placeholder="Например, Анна"
              value={name}
              invalid={Boolean(error)}
              disabled={saving}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Сохраняем…" : "Продолжить"}
          </Button>
        </form>
      </div>
    </main>
  );
}
