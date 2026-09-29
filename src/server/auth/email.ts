import "server-only";

import { Resend } from "resend";

import { LOGIN_TOKEN_TTL_MINUTES } from "./login-link";

/** Отправитель по умолчанию — тестовый домен Resend, работает без настройки DNS. */
const DEFAULT_FROM = "Дела в порядке <onboarding@resend.dev>";

export type SendResult = { sent: true; provider: "resend" | "console" } | { sent: false; error: string };

/**
 * Публичный адрес приложения. APP_URL задаётся на Railway; локально берём
 * Origin/Host самого запроса, чтобы ссылка вела туда, куда кликнули.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function magicLinkHtml(link: string, minutes: number): string {
  const button = `
    <a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;
      text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Войти в «Дела в порядке»
    </a>`;

  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Дела в порядке</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Вход по ссылке</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
        Нажмите кнопку, чтобы войти. Пароля нет — ссылка и есть вход.
      </p>
      ${button}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
        Ссылка действует ${minutes} минут и сработает только один раз.
        Если вы её не запрашивали — просто проигнорируйте письмо.
      </p>
      <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;word-break:break-all;">
        Если кнопка не нажимается, скопируйте адрес: ${link}
      </p>
    </div>
  </body>
</html>`;
}

/**
 * Отправляет ссылку для входа. Без RESEND_API_KEY письмо не уходит, а ссылка
 * печатается в лог — так весь сценарий входа проверяется локально целиком.
 */
export async function sendMagicLink(
  request: Request,
  email: string,
  token: string,
): Promise<SendResult> {
  const link = `${publicOrigin(request)}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.log(`[auth] RESEND_API_KEY не задан — ссылка для входа (${email}):`);
    console.log(`[auth] ${link}`);
    return { sent: true, provider: "console" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM,
      to: email,
      subject: "Вход в «Дела в порядке»",
      html: magicLinkHtml(link, LOGIN_TOKEN_TTL_MINUTES),
    });

    if (error) {
      console.error("[auth] Resend не принял письмо:", error);
      return { sent: false, error: "Не удалось отправить письмо. Попробуйте позже." };
    }
    return { sent: true, provider: "resend" };
  } catch (error) {
    console.error("[auth] Сбой отправки письма:", error);
    return { sent: false, error: "Не удалось отправить письмо. Попробуйте позже." };
  }
}
