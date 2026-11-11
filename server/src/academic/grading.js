import { SCHEDULE_TIME_ZONE } from './time.js';

// Оцінювання за результатом консультації (етап 9б): види контролю, національна шкала,
// поточний семестр студента. Оцінки виставляються за 100-бальною шкалою.

export const GRADE_CONTROL_TYPES = [
  'Екзамен',
  'Залік',
  'Диференційований залік',
  'Лабораторна робота',
  'Практична робота',
  'Розрахункова робота',
  'Курсова робота',
];

export const PASSING_SCORE = 60;

// Національна шкала: для заліку – «Зараховано» / «Не зараховано», інакше – чотирибальна
export function nationalGrade(score, controlType) {
  if (controlType === 'Залік') return score >= PASSING_SCORE ? 'Зараховано' : 'Не зараховано';
  if (score >= 90) return 'Відмінно';
  if (score >= 74) return 'Добре';
  if (score >= PASSING_SCORE) return 'Задовільно';
  return 'Незадовільно';
}

// Поточний семестр за курсом: вересень – січень – непарний (осінній) семестр курсу,
// лютий – серпень – парний (весняний). Місяць визначається за часом Europe/Kyiv.
export function currentSemester(course, date = new Date()) {
  const month = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: SCHEDULE_TIME_ZONE, month: 'numeric' }).format(
      date,
    ),
  );
  const autumn = month >= 9 || month === 1;
  return Math.min(12, Math.max(1, course * 2 - (autumn ? 1 : 0)));
}
