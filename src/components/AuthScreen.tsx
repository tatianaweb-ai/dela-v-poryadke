"use client";

import { ListChecks } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppStore } from "@/context/AppStore";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;

export function AuthScreen() {
  const { signIn } = useAppStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < MIN_NAME_LENGTH) {
      setError("Введите имя — минимум 2 символа");
      return;
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`Имя не должно быть длиннее ${MAX_NAME_LENGTH} символов`);
      return;
    }

    setError(null);
    signIn(trimmed);
  };

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

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <Field label="Ваше имя" htmlFor="name" error={error ?? undefined} required>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              autoFocus
              placeholder="Например, Анна"
              value={name}
              invalid={Boolean(error)}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <Button type="submit" fullWidth>
            Войти в приложение
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Данные хранятся только в вашем браузере (LocalStorage) и никуда не отправляются.
        </p>
      </div>
    </main>
  );
}
