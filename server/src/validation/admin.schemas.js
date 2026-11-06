import { z } from 'zod';

export const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];

// PATCH /api/admin/users/:id/role: роль лише з переліку (ТЗ, п. 4.1.3)
export const changeRoleSchema = z.object({
  role: z.enum(ROLES, { error: 'Роль має бути однією з: STUDENT, TEACHER, ADMIN' }),
});
