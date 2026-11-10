// Контракт постачальника академічних даних AcademicDataProvider (ТЗ таблиця 4.4).
// Постачальник – об'єкт із властивістю name (ідентифікатор, що зберігається
// в AcademicDataMapping.provider) і асинхронними методами:
//
//   getInfo()                                      → { provider, isDemo, dataAsOf }
//   getStudentProfile(externalId)                  → AcademicProfile | null
//   getStudentRecords(externalId, { semester })    → AcademicRecord[]
//   getStudentDebts(externalId, { status })        → AcademicDebt[]       (status: open | all)
//   getStudentSchedule(externalId, { from, to })   → ClassScheduleEntry[] (from, to – Date, ≤ 31 доби)
//   listSubjects()                                 → { externalId, name }[]  (для seed)
//   getTeacherSubjects(externalTeacherId)          → externalId дисциплін[]  (для seed)
//
// У разі збою метод генерує AcademicProviderError. Формат даних описано схемами в schemas.js.
// Модулі слотів і записів працюють лише із сервісом академічної інтеграції (academic.service.js)
// і не залежать від конкретного постачальника.

export const PROVIDER_METHODS = [
  'getInfo',
  'getStudentProfile',
  'getStudentRecords',
  'getStudentDebts',
  'getStudentSchedule',
  'listSubjects',
  'getTeacherSubjects',
];

// Найбільший період одного запиту розкладу до постачальника
export const MAX_SCHEDULE_DAYS = 31;

export function assertProvider(provider) {
  const missing = PROVIDER_METHODS.filter((method) => typeof provider?.[method] !== 'function');
  if (!provider?.name || missing.length > 0) {
    throw new Error(
      `Постачальник академічних даних не відповідає контракту: ${missing.join(', ') || 'name'}`,
    );
  }
  return provider;
}
