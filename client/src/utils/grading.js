// Оцінювання за результатом консультації (етап 9б). Дублює server/src/academic/grading.js:
// остаточну оцінку за національною шкалою визначає сервер, тут – лише попередній перегляд.
const CREDIT = 'Залік';

export function nationalGrade(score, controlType) {
  if (controlType === CREDIT) return score >= 60 ? 'Зараховано' : 'Не зараховано';
  if (score >= 90) return 'Відмінно';
  if (score >= 74) return 'Добре';
  if (score >= 60) return 'Задовільно';
  return 'Незадовільно';
}

// Бал з поля форми: ціле число 0–100 або null
export function parseScore(value) {
  const v = String(value).trim();
  if (!/^\d{1,3}$/.test(v)) return null;
  const score = Number(v);
  return score <= 100 ? score : null;
}
