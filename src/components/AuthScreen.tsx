"use client";

import { ListChecks, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppStore } from "@/context/AppStore";
import { looksLikeEmail } from "@/lib/supabase/auth";

type SendState = "idle" | "sending" | "sent";

export function AuthScreen() {
  const { requestMagicLink, authNotice } = useAppStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SendState>("idle");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!looksLikeEmail(trimmed)) {
      setError("Введите почту, например anna@example.com");
      return;
    }

    setError(null);
    setState("sending");

    const result = await requestMagicLink(trimmed);
    if (!result.ok) {
      setError(result.error ?? "Не удалось отправить письмо. Попробуйте позже.");
      setState("idle");
      return;
    }

    setState("sent");
  };

  if (state === "sent") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 flex flex-col items-center">
            <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
              <MailCheck className="size-7" />
            </span>
            <Logo className="text-2xl" />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Проверьте почту
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              Мы отправили ссылку для входа на <span className="font-medium text-slate-700">{email.trim()}</span>.
              Откройте её — и вы окажетесь в приложении. Пароля нет.
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Ссылка действует 60 минут. Не нашли письмо? Проверьте папку «Спам» или попробуйте другой адрес.
            </p>
            <Button variant="secondary" fullWidth onClick={() => setState("idle")}>
              Ввести другой адрес
            </Button>
          </div>
        </div>
      </main>
    );
  }

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

        {authNotice && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
          >
            {authNotice}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <Field label="Электронная почта" htmlFor="email" error={error ?? undefined} required>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="anna@example.com"
              value={email}
              invalid={Boolean(error)}
              disabled={state === "sending"}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <Button type="submit" fullWidth disabled={state === "sending"}>
            {state === "sending" ? "Отправляем…" : "Получить ссылку для входа"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Пароля нет. Мы отправим письмо со ссылкой — войдёте по ней.
        </p>
      </div>
    </main>
  );
}
