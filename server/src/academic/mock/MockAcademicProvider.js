import { readFileSync } from 'node:fs';
import { addDays, isoWeekday, zonedDateString, zonedTimeToUtc } from '../time.js';

// Демонстраційний постачальник академічних даних (ТЗ п. 4.1.5). Дані беруться з JSON-fixtures
// у каталозі fixtures/ і є вигаданими; мережевих запитів до систем університету немає.
// Розклад у fixtures – тижневий шаблон (час Europe/Kyiv), який розгортається в дати
// запитаного періоду з перетворенням в UTC.
//
// Щоб тижні не були однаковими, шаблон діє в межах циклу з CYCLE_WEEKS тижнів (як
// «чисельник/знаменник» в університетському розкладі, лише довший). Заняття з полем weeks
// (номери тижнів циклу, 1…CYCLE_WEEKS) проводяться лише в ці тижні, без поля – щотижня.
// Номер тижня обчислюється від CYCLE_START, тож для будь-якої дати він однаковий
// за кожного запиту.
const DAY_MS = 24 * 60 * 60 * 1000;
export const CYCLE_WEEKS = 4;
const CYCLE_START = '2026-11-16'; // понеділок першого тижня циклу

// Номер тижня циклу (1…CYCLE_WEEKS) для календарної дати YYYY-MM-DD
export function cycleWeek(dateString) {
  const days =
    (Date.parse(`${dateString}T00:00:00Z`) - Date.parse(`${CYCLE_START}T00:00:00Z`)) / DAY_MS;
  const week = Math.floor(days / 7);
  return (((week % CYCLE_WEEKS) + CYCLE_WEEKS) % CYCLE_WEEKS) + 1;
}

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
      const week = cycleWeek(date);
      const items = template.filter(
        (entry) => entry.weekday === weekday && (!entry.weeks || entry.weeks.includes(week)),
      );
      for (const item of items) {
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
