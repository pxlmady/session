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

export const teachersApi = {
  list: (search) =>
    request('GET', `/teachers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  freeSlots: (teacherId) => request('GET', `/teachers/${teacherId}/slots`),
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
};

// Адміністрування (FR-25, FR-26). Серверні ендпоінти реалізуються на етапі 7 ТЗ;
// клієнт очікує такі відповіді:
//   GET /admin/stats → { usersByRole: { STUDENT, TEACHER, ADMIN }, slotsTotal,
//                        bookingsByStatus: { PENDING, CONFIRMED, CANCELLED },
//                        bookingsByTeacher: [{ teacherId, fullName, count }] }
//   GET /admin/users → [{ id, fullName, email, role, department, studentGroup }]
//   PATCH /admin/users/:id/role { role } → { user }
export const adminApi = {
  stats: () => request('GET', '/admin/stats'),
  users: () => request('GET', '/admin/users'),
  changeRole: (id, role) => request('PATCH', `/admin/users/${id}/role`, { role }),
};
