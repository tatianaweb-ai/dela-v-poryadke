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
