export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 40;
export const MIN_PASSWORD_LENGTH = 6;

/** Чем именно человек входит: по существующему паролю или создаёт аккаунт. */
export type AuthMode = "sign-in" | "sign-up";

/**
 * Имя для приветствия берём из почты, пока пользователь не задал своё.
 * «anna.petrova@gmail.com» → «anna.petrova». Человечнее, чем пустая строка,
 * и не выдумывает имени, которого у нас нет.
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local || email;
}

/** Проверка адреса на стороне клиента. Сервер проверяет повторно — это только UX. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Сообщения Supabase приходят по-английски, а экран входа читает человек,
 * далёкий от разработки. Переводим то, что встречается на первом входе;
 * оригинал пишется в консоль, чтобы диагностика не терялась.
 */
export function humanizeAuthError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) return "Неверная почта или пароль.";
  if (text.includes("already registered")) return "Такая почта уже зарегистрирована — войдите по паролю.";
  if (text.includes("different from")) return "Новый пароль должен отличаться от старого.";
  if (text.includes("email not confirmed")) {
    return "Почта не подтверждена. Проверьте входящие и папку «Спам».";
  }
  if (text.includes("password")) return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  }
  if (text.includes("network") || text.includes("fetch")) {
    return "Нет связи с сервером. Проверьте интернет и повторите.";
  }

  return "Не получилось войти. Попробуйте ещё раз.";
}
