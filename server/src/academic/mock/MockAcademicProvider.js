import { readFileSync } from 'node:fs';
import { addDays, isoWeekday, zonedDateString, zonedTimeToUtc } from '../time.js';

// Демонстраційний постачальник академічних даних (ТЗ п. 4.1.5). Дані беруться з JSON-fixtures
// у каталозі fixtures/ і є вигаданими; мережевих запитів до систем університету немає.
// Розклад у fixtures – тижневий шаблон (час Europe/Kyiv), який розгортається в дати
// запитаного періоду з перетворенням в UTC.

function readFixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

// Копія даних, щоб зміни результату не впливали на fixtures
const clone = (value) => structuredClone(value);

export class MockAcademicProvider {
  name = 'mock';

  constructor(fixtures = {}) {
    this.info = fixtures.info ?? readFixture('info');
    this.subjects = fixtures.subjects ?? readFixture('subjects');
    this.teachers = fixtures.teachers ?? readFixture('teachers');
    this.students = fixtures.students ?? readFixture('students');
    this.schedules = fixtures.schedules ?? readFixture('schedules');
  }

  #student(externalId) {
    return this.students.find((student) => student.externalId === externalId) ?? null;
  }

  async getInfo() {
    return clone(this.info);
  }

  async getStudentProfile(externalId) {
    const student = this.#student(externalId);
    return student ? clone(student.profile) : null;
  }

  async getStudentRecords(externalId, { semester } = {}) {
    const records = this.#student(externalId)?.records ?? [];
    return clone(semester ? records.filter((record) => record.semester === semester) : records);
  }

  async getStudentDebts(externalId, { status = 'open' } = {}) {
    const debts = this.#student(externalId)?.debts ?? [];
    return clone(status === 'all' ? debts : debts.filter((debt) => debt.status === 'open'));
  }

  // Заняття, що перетинаються з періодом [from, to), упорядковані за часом початку
  async getStudentSchedule(externalId, { from, to }) {
    const student = this.#student(externalId);
    const template = student ? (this.schedules[student.profile.group] ?? []) : [];
    const subjectNames = new Map(this.subjects.map((s) => [s.externalId, s.name]));

    const entries = [];
    const lastDate = zonedDateString(new Date(to.getTime() - 1));
    for (let date = zonedDateString(from); date <= lastDate; date = addDays(date, 1)) {
      const weekday = isoWeekday(date);
      for (const item of template.filter((entry) => entry.weekday === weekday)) {
        const startAt = zonedTimeToUtc(date, item.start);
        const endAt = zonedTimeToUtc(date, item.end);
        if (startAt < to && endAt > from) {
          entries.push({
            id: `${item.id}-${date}`,
            subjectExternalId: item.subjectExternalId,
            subjectName: subjectNames.get(item.subjectExternalId) ?? item.subjectExternalId,
            classType: item.classType,
            teacherName: item.teacherName ?? null,
            location: item.location ?? null,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          });
        }
      }
    }
    return entries.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id));
  }

  async listSubjects() {
    return clone(this.subjects);
  }

  async getTeacherSubjects(externalTeacherId) {
    const teacher = this.teachers.find((t) => t.externalId === externalTeacherId);
    return clone(teacher?.subjects ?? []);
  }
}
