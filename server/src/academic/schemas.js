import { z } from 'zod';

// Схеми Zod для даних, отриманих від постачальника (ТЗ п. 4.1.5: дані перевіряються
// перед використанням). Дані, що не відповідають схемі, вважаються збоєм постачальника.

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instant = z.iso.datetime({ offset: true });

export const providerInfoSchema = z.object({
  provider: z.string().min(1),
  isDemo: z.boolean(),
  dataAsOf: instant.nullable(),
});

export const academicProfileSchema = z
  .object({
    group: z.string().min(1),
    institute: z.string().min(1),
    specialty: z.string().min(1),
    course: z.number().int().min(1).max(6),
    studyForm: z.string().min(1),
    averageScore: z.number().min(0).max(100).nullable(),
  })
  .nullable();

export const academicRecordsSchema = z.array(
  z.object({
    id: z.string().min(1),
    subjectExternalId: z.string().min(1),
    semester: z.number().int().min(1).max(12),
    controlType: z.string().min(1),
    score: z.number().int().min(0).max(100),
    nationalGrade: z.string().min(1),
    date: dateOnly,
  }),
);

export const academicDebtsSchema = z.array(
  z.object({
    id: z.string().min(1),
    subjectExternalId: z.string().min(1),
    debtType: z.string().min(1),
    description: z.string().nullable(),
    deadline: dateOnly.nullable(),
    status: z.enum(['open', 'closed']),
  }),
);

export const classScheduleSchema = z.array(
  z
    .object({
      id: z.string().min(1),
      subjectExternalId: z.string().min(1),
      subjectName: z.string().min(1),
      classType: z.string().min(1),
      teacherName: z.string().nullable(),
      location: z.string().nullable(),
      startAt: instant,
      endAt: instant,
    })
    .refine((entry) => Date.parse(entry.endAt) > Date.parse(entry.startAt)),
);

export const subjectListSchema = z.array(
  z.object({ externalId: z.string().min(1), name: z.string().min(1).max(200) }),
);

export const teacherSubjectsSchema = z.array(z.string().min(1));
