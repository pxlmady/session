// Дані аватара-заглушки: ініціали (прізвище та ім'я з ПІБ) і відтінок кольору.
// Відтінок обчислюється з id (або email) користувача, тому однаковий на всіх сторінках
// і не потребує окремого поля в базі даних.

const HUES = [248, 200, 160, 28, 330, 280, 12, 186, 222, 300];

export function initialsOf(fullName = '') {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]);
  return letters.join('').toUpperCase() || '?';
}

export function avatarHue(user) {
  const key = String(user?.id ?? user?.email ?? user?.fullName ?? '');
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)) % 9973;
  return HUES[hash % HUES.length];
}
