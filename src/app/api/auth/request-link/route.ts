import { z } from "zod";

import { sendMagicLink } from "@/server/auth/email";
import { issueLoginToken } from "@/server/auth/login-link";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";

const bodySchema = z.object({
  email: z.string().trim().min(1, "Укажите почту").email("Похоже, адрес написан неверно").max(254),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("Запрос отклонён", 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Ожидался JSON", 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Проверьте адрес", 400);
  }

  const { email } = parsed.data;
  const ip = clientIp(request);

  const issued = await issueLoginToken(email, ip);
  if (!issued.ok) {
    // Отвечаем так же, как при успехе: иначе по ответу можно перебором
    // выяснить, какие адреса уже зарегистрированы.
    console.warn(`[auth] rate limit по адресу ${issued.email} с ${ip ?? "неизвестного IP"}`);
    return Response.json({ ok: true, message: "Если такой адрес подходит, мы отправили на него ссылку." });
  }

  const sent = await sendMagicLink(request, issued.email, issued.token);

  if (!sent.sent) {
    return jsonError(sent.error, 502);
  }

  if (sent.provider === "console") {
    // В разработке показываем прямую ссылку, иначе пришлось бы копать лог.
    const origin = new URL(request.url).origin;
    return Response.json({
      ok: true,
      message: "Письмо не отправлялось: RESEND_API_KEY не задан. Ссылка для входа ниже.",
      devLink: `${origin}/api/auth/verify?token=${encodeURIComponent(issued.token)}`,
    });
  }

  return Response.json({ ok: true, message: "Если такой адрес подходит, мы отправили на него ссылку." });
}

export function GET() {
  return jsonError("Метод не поддерживается", 405);
}
