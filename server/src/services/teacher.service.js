import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { slotSelect, teacherSelect } from '../lib/selects.js';
import { assertSubjectExists } from './subject.service.js';

const byName = (a, b) => a.name.localeCompare(b.name, 'uk') || a.id - b.id;

const teacherNotFound = () => new AppError(404, 'TEACHER_NOT_FOUND', 'Викладача не знайдено');

// Дані викладача з його дисциплінами (FR-32)
const teacherWithSubjectsSelect = {
  ...teacherSelect,
  subjects: { select: { subject: { select: { id: true, name: true } } } },
};

// Дисципліни впорядковано за назвою за правилами української абетки
// (порядок сортування БД залежить від її налаштувань локалі)
const withSubjects = ({ subjects, ...teacher }) => ({
  ...teacher,
  subjects: subjects.map((link) => link.subject).sort(byName),
});

// FR-13: список викладачів з пошуком за ПІБ (без урахування регістру);
// FR-32: фільтр за дисципліною (неіснуюча дисципліна – 404 SUBJECT_NOT_FOUND)
export async function listTeachers({ search, subjectId } = {}) {
  if (subjectId) await assertSubjectExists(subjectId);
  const teachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER',
      ...(search ? { fullName: { contains: search, mode: 'insensitive' } } : {}),
      ...(subjectId ? { subjects: { some: { subjectId } } } : {}),
    },
    orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    select: teacherWithSubjectsSelect,
  });
  return teachers.map(withSubjects);
}

// GET /api/teachers/:id: дані викладача з дисциплінами (FR-32)
export async function getTeacher(teacherId) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER' },
    select: teacherWithSubjectsSelect,
  });
  if (!teacher) throw teacherNotFound();
  return withSubjects(teacher);
}

// FR-14: майбутні вільні слоти викладача, упорядковані за часом початку.
// FR-34: для студента кожен слот містить scheduleCheck і conflicts (перевірка накладок
// із розкладом занять); для інших ролей ці поля не додаються.
export async function listFreeSlots(teacherId, user, academic) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER' },
    select: { id: true },
  });
  if (!teacher) throw teacherNotFound();

  const slots = await prisma.slot.findMany({
    where: { teacherId, status: 'FREE', startAt: { gt: new Date() } },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    select: slotSelect,
  });
  return academic.checkSlots(user, slots);
}
