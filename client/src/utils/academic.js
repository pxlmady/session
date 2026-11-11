import { formatTimeRange } from './datetime.js';

// Допоміжні функції академічного контексту (UX v2, розд. 4)

// Помилки академічних ендпоінтів, що мають окремі стани в інтерфейсі (табл. 8.1)
export const isAcademicError = (error) =>
  error?.code === 'ACADEMIC_PROFILE_NOT_LINKED' || error?.code === 'ACADEMIC_PROVIDER_UNAVAILABLE';

// Заняття, з яким перетинається слот: «Бази даних, лабораторна робота, 11:40–13:00»
export function conflictText(conflict) {
  return `${conflict.subjectName}, ${conflict.classType.toLowerCase()}, ${formatTimeRange(conflict.startAt, conflict.endAt)}`;
}

// Найближчий вільний слот без накладки із заняттями (FR-34). Якщо перевірка розкладу
// недоступна (UNAVAILABLE), береться найближчий вільний слот.
export function nearestSlot(slots = []) {
  return slots.find((slot) => slot.scheduleCheck !== 'CONFLICT') ?? null;
}
