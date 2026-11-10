import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { teacherSelect } from '../lib/selects.js';

export const subjectNotFound = () =>
  new AppError(404, 'SUBJECT_NOT_FOUND', 'Дисципліну не знайдено');

// Викладачі дисципліни: лише користувачі з поточною роллю TEACHER
const subjectTeachersSelect = {
  where: { teacher: { role: 'TEACHER' } },
  select: { teacher: { select: teacherSelect } },
};

// Упорядкування за правилами української абетки (не залежить від локалі БД)
const byFullName = (a, b) => a.fullName.localeCompare(b.fullName, 'uk') || a.id - b.id;
const byName = (a, b) => a.name.localeCompare(b.name, 'uk') || a.id - b.id;

// FR-32: довідник дисциплін з пошуком за назвою і кількістю викладачів Session
export async function listSubjects(search) {
  const subjects = await prisma.subject.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
    select: { id: true, name: true, teachers: subjectTeachersSelect },
  });
  return subjects
    .map(({ teachers, ...subject }) => ({ ...subject, teachersCount: teachers.length }))
    .sort(byName);
}

// FR-32: дисципліна та її викладачі
export async function getSubject(id) {
  const subject = await prisma.subject.findUnique({
    where: { id },
    select: { id: true, name: true, teachers: subjectTeachersSelect },
  });
  if (!subject) throw subjectNotFound();
  return {
    id: subject.id,
    name: subject.name,
    teachers: subject.teachers.map((link) => link.teacher).sort(byFullName),
  };
}

// Перевірка, що дисципліна існує (бронювання, фільтр викладачів)
export async function assertSubjectExists(id) {
  const subject = await prisma.subject.findUnique({ where: { id }, select: { id: true } });
  if (!subject) throw subjectNotFound();
}
