import { request } from './client.js';

// Ендпоінти REST API (ТЗ, таблиця 23)

export const authApi = {
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/auth/me'),
};

export const usersApi = {
  updateMe: (data) => request('PATCH', '/users/me', data),
};

// Рядок запиту з непорожніх параметрів: { search: 'а', subjectId: 2 } → '?search=%D0%B0&subjectId=2'
function query(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}

export const teachersApi = {
  // FR-13, FR-32: пошук за ПІБ і фільтр за дисципліною
  list: ({ search, subjectId } = {}) => request('GET', `/teachers${query({ search, subjectId })}`),
  // Дані викладача з дисциплінами (FR-32)
  get: (teacherId) => request('GET', `/teachers/${teacherId}`),
  // Для студента кожен слот містить scheduleCheck і conflicts (FR-34)
  freeSlots: (teacherId) => request('GET', `/teachers/${teacherId}/slots`),
};

// Довідник дисциплін (FR-32): [{ id, name, teachersCount }], { id, name, teachers }
export const subjectsApi = {
  list: (search) => request('GET', `/subjects${query({ search })}`),
  get: (id) => request('GET', `/subjects/${id}`),
};

// Академічні дані студента (FR-27 – FR-31, FR-37). Відповіді мають вигляд { data, meta },
// meta = { provider, isDemo, dataAsOf }. Помилки: 404 ACADEMIC_PROFILE_NOT_LINKED
// (обліковий запис не зіставлено), 503 ACADEMIC_PROVIDER_UNAVAILABLE (джерело недоступне).
export const academicApi = {
  status: () => request('GET', '/academic/status'),
  profile: () => request('GET', '/academic/me/profile'),
  records: (semester) => request('GET', `/academic/me/records${query({ semester })}`),
  debts: (status = 'open') => request('GET', `/academic/me/debts${query({ status })}`),
  // from, to – календарні дати YYYY-MM-DD (не більше 31 доби)
  schedule: (from, to) => request('GET', `/academic/me/schedule${query({ from, to })}`),
};

export const slotsApi = {
  listMy: () => request('GET', '/slots/my'),
  create: (data) => request('POST', '/slots', data),
  update: (id, data) => request('PATCH', `/slots/${id}`, data),
  remove: (id) => request('DELETE', `/slots/${id}`),
};

export const bookingsApi = {
  create: (data) => request('POST', '/bookings', data),
  listMy: (period) => request('GET', `/bookings/my?period=${period}`),
  confirm: (id) => request('PATCH', `/bookings/${id}/confirm`),
  reject: (id) => request('PATCH', `/bookings/${id}/reject`),
  cancel: (id) => request('PATCH', `/bookings/${id}/cancel`),
  // Результат консультації після її завершення (викладач, етап 9б):
  //   resultOptions → { subject, available, debts: [{ id, debtType, description, deadline }],
  //   grading: { semester, controlTypes, passingScore } | null } – відкриті заборгованості
  //   студента з дисципліни запису і можливість виставити оцінку;
  //   complete { note?, closeDebtId?, grade?: { controlType, score } } – позначка «Проведено»,
  //   рекомендація, закриття заборгованості, оцінка
  resultOptions: (id) => request('GET', `/bookings/${id}/result-options`),
  complete: (id, data) => request('PATCH', `/bookings/${id}/complete`, data),
};

// Адміністрування (FR-25, FR-26), лише для ролі ADMIN. Формат відповідей:
//   GET /admin/stats → { usersByRole: { STUDENT, TEACHER, ADMIN }, slotsTotal,
//                        bookingsByStatus: { PENDING, CONFIRMED, CANCELLED },
//                        bookingsByTeacher: [{ teacherId, fullName, count }],
//                        academic: { provider, isDemo, dataAsOf, available, subjectsTotal,
//                                    linkedStudents, linkedTeachers } }
//   GET /admin/users → [{ id, fullName, email, role, department, studentGroup }]
//   PATCH /admin/users/:id/role { role } → { user }; власну роль змінити не можна (409)
export const adminApi = {
  stats: () => request('GET', '/admin/stats'),
  users: () => request('GET', '/admin/users'),
  changeRole: (id, role) => request('PATCH', `/admin/users/${id}/role`, { role }),
};
