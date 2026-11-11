import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { AcademicProviderError } from './errors.js';
import { assertProvider, MAX_SCHEDULE_DAYS } from './provider.js';
import {
  academicDebtsSchema,
  academicProfileSchema,
  academicRecordsSchema,
  classScheduleSchema,
  providerInfoSchema,
  subjectListSchema,
} from './schemas.js';
import { currentSemester } from './grading.js';
import { addDays, zonedDateString, zonedTimeToUtc } from './time.js';

// Сервіс академічної інтеграції (ТЗ п. 4.1.5, FR-27 – FR-37, FR-40). Єдина точка звернення
// до постачальника: зіставлення користувача, тайм-аут, перевірка даних схемами Zod,
// meta { provider, isDemo, dataAsOf } і перевірка накладок слотів із розкладом студента.
// Звернення до постачальника виконуються поза транзакціями БД.

export const DEFAULT_TIMEOUT_MS = 3000;

export const SCHEDULE_CHECK = { OK: 'OK', CONFLICT: 'CONFLICT', UNAVAILABLE: 'UNAVAILABLE' };

const DAY_MS = 24 * 60 * 60 * 1000;

const notLinked = () =>
  new AppError(
    404,
    'ACADEMIC_PROFILE_NOT_LINKED',
    'Академічні дані недоступні: обліковий запис не зіставлено з академічним профілем',
  );

const unavailable = () =>
  new AppError(
    503,
    'ACADEMIC_PROVIDER_UNAVAILABLE',
    'Джерело академічних даних тимчасово недоступне. Спробуйте пізніше',
  );

// У журнал записується лише назва методу й причина збою, без академічних даних (табл. 4.9)
function logProviderFailure(provider, method, reason) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`Постачальник академічних даних "${provider}", ${method}: ${reason}`);
  }
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new AcademicProviderError(`перевищено час очікування ${ms} мс`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Інтервали [startAt, endAt) перетинаються; суміжні (кінець одного = початок іншого) – ні
export const overlaps = (a, b) => a.startAt < b.endAt && b.startAt < a.endAt;

export function createAcademicService({ provider, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  assertProvider(provider);
  const name = provider.name;

  // Виклик методу постачальника з тайм-аутом і перевіркою результату схемою.
  // Будь-який збій перетворюється на AcademicProviderError.
  async function call(method, schema, ...args) {
    let raw;
    try {
      raw = await withTimeout(
        Promise.resolve().then(() => provider[method](...args)),
        timeoutMs,
      );
    } catch (err) {
      logProviderFailure(name, method, err.message);
      throw new AcademicProviderError(`Збій методу ${method}`, { cause: err });
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      logProviderFailure(
        name,
        method,
        `дані не відповідають схемі (${parsed.error.issues.length})`,
      );
      throw new AcademicProviderError(`Некоректні дані методу ${method}`);
    }
    return parsed.data;
  }

  // Для академічних ендпоінтів збій постачальника → 503 (FR-36)
  async function callOrFail(method, schema, ...args) {
    try {
      return await call(method, schema, ...args);
    } catch (err) {
      if (err instanceof AcademicProviderError) throw unavailable();
      throw err;
    }
  }

  const toMeta = (info) => ({
    provider: info.provider,
    isDemo: info.isDemo,
    dataAsOf: info.dataAsOf,
  });

  // Зовнішній ідентифікатор користувача за AcademicDataMapping (FR-27)
  async function findExternalId(userId) {
    const mapping = await prisma.academicDataMapping.findFirst({
      where: { userId, provider: name },
      select: { externalId: true },
    });
    return mapping?.externalId ?? null;
  }

  // Відповідь академічного ендпоінта { data, meta } для зіставленого студента (FR-37).
  // Зіставлення перевіряється до звернення до постачальника.
  async function respond(user, load) {
    const externalId = await findExternalId(user.id);
    if (!externalId) throw notLinked();
    const info = await callOrFail('getInfo', providerInfoSchema);
    const data = await load(externalId);
    return { data, meta: toMeta(info) };
  }

  // Заміна subjectExternalId на дисципліну Session { id, name }; id = null, якщо дисципліни
  // немає в довіднику Session (тоді назва береться з довідника постачальника)
  async function attachSubjects(items) {
    const externalIds = [...new Set(items.map((item) => item.subjectExternalId))];
    if (externalIds.length === 0) return [];
    const subjects = await prisma.subject.findMany({
      where: { externalId: { in: externalIds } },
      select: { id: true, name: true, externalId: true },
    });
    const known = new Map(subjects.map((s) => [s.externalId, { id: s.id, name: s.name }]));
    let providerNames;
    if (externalIds.some((id) => !known.has(id))) {
      const list = await callOrFail('listSubjects', subjectListSchema);
      providerNames = new Map(list.map((s) => [s.externalId, s.name]));
    }
    return items.map(({ subjectExternalId, subjectName, ...rest }) => ({
      ...rest,
      subject: known.get(subjectExternalId) ?? {
        id: null,
        name: providerNames?.get(subjectExternalId) ?? subjectName ?? subjectExternalId,
      },
    }));
  }

  // Розклад за довільний період: запити до постачальника частинами не довше 31 доби
  async function loadSchedule(externalId, from, to) {
    const entries = new Map();
    for (let start = from.getTime(); start < to.getTime(); start += MAX_SCHEDULE_DAYS * DAY_MS) {
      const end = Math.min(start + MAX_SCHEDULE_DAYS * DAY_MS, to.getTime());
      const part = await call('getStudentSchedule', classScheduleSchema, externalId, {
        from: new Date(start),
        to: new Date(end),
      });
      for (const entry of part) entries.set(entry.id, entry);
    }
    return [...entries.values()].map((entry) => ({
      ...entry,
      startAt: new Date(entry.startAt),
      endAt: new Date(entry.endAt),
    }));
  }

  // GET /api/academic/status: стан джерела і зіставлення поточного користувача.
  // Відповідає 200 і за недоступності джерела (available = false).
  async function getStatus(user) {
    const linked = Boolean(await findExternalId(user.id));
    try {
      const info = await call('getInfo', providerInfoSchema);
      return { data: { ...toMeta(info), available: true, linked }, meta: toMeta(info) };
    } catch (err) {
      if (!(err instanceof AcademicProviderError)) throw err;
      const meta = { provider: name, isDemo: null, dataAsOf: null };
      return { data: { ...meta, available: false, linked }, meta };
    }
  }

  // FR-28: академічний профіль
  function getMyProfile(user) {
    return respond(user, async (externalId) => {
      const profile = await callOrFail('getStudentProfile', academicProfileSchema, externalId);
      if (!profile) throw notLinked();
      return profile;
    });
  }

  // Оцінки, виставлені викладачами в Session за результатом консультацій (етап 9б),
  // у форматі оцінок джерела з позначкою setInSession
  async function loadSessionGrades(userId) {
    const grades = await prisma.gradeEntry.findMany({
      where: { studentId: userId, provider: name },
      select: {
        id: true,
        semester: true,
        controlType: true,
        score: true,
        nationalGrade: true,
        createdAt: true,
        bookingId: true,
        subject: { select: { id: true, name: true } },
        booking: { select: { slot: { select: { teacher: { select: { fullName: true } } } } } },
      },
    });
    return grades.map((grade) => ({
      id: `SESSION-${grade.id}`,
      semester: grade.semester,
      controlType: grade.controlType,
      score: grade.score,
      nationalGrade: grade.nationalGrade,
      date: zonedDateString(grade.createdAt),
      subject: grade.subject,
      setInSession: {
        bookingId: grade.bookingId,
        teacherName: grade.booking.slot.teacher.fullName,
      },
    }));
  }

  // FR-29: оцінки, за потреби – лише вказаного семестру. Оцінки джерела доповнюються
  // оцінками, виставленими в Session (етап 9б); у джерелі нічого не змінюється.
  function getMyRecords(user, { semester } = {}) {
    return respond(user, async (externalId) => {
      const [records, sessionGrades] = await Promise.all([
        callOrFail('getStudentRecords', academicRecordsSchema, externalId, { semester }),
        loadSessionGrades(user.id),
      ]);
      const fromProvider = (await attachSubjects(records)).map((record) => ({
        ...record,
        setInSession: null,
      }));
      return [...fromProvider, ...sessionGrades]
        .filter((record) => !semester || record.semester === semester)
        .sort(
          (a, b) =>
            a.semester - b.semester || a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
        );
    });
  }

  // Заборгованості студента з урахуванням закриттів у Session (етап 9б). Заборгованість,
  // яку викладач закрив після консультації (DebtClosure), повертається зі статусом closed
  // і полем closedInSession; дані джерела при цьому не змінюються.
  async function loadDebts(userId, externalId) {
    const [debts, closures] = await Promise.all([
      callOrFail('getStudentDebts', academicDebtsSchema, externalId, { status: 'all' }),
      prisma.debtClosure.findMany({
        where: { studentId: userId, provider: name },
        select: {
          debtId: true,
          createdAt: true,
          bookingId: true,
          booking: { select: { slot: { select: { teacher: { select: { fullName: true } } } } } },
        },
      }),
    ]);
    const closed = new Map(closures.map((closure) => [closure.debtId, closure]));
    const withClosures = debts.map((debt) => {
      const closure = closed.get(debt.id);
      if (!closure) return { ...debt, closedInSession: null };
      return {
        ...debt,
        status: 'closed',
        closedInSession: {
          closedAt: closure.createdAt.toISOString(),
          bookingId: closure.bookingId,
          teacherName: closure.booking.slot.teacher.fullName,
        },
      };
    });
    withClosures.sort(
      (a, b) =>
        (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31') ||
        a.id.localeCompare(b.id),
    );
    return attachSubjects(withClosures);
  }

  // FR-30: заборгованості; за замовчуванням лише відкриті
  function getMyDebts(user, { status = 'open' } = {}) {
    return respond(user, async (externalId) => {
      const debts = await loadDebts(user.id, externalId);
      return debts.filter((debt) => status === 'all' || debt.status === 'open');
    });
  }

  // Етап 9б: дані для фіксації результату консультації з дисципліни subjectId – відкриті
  // заборгованості студента лише з цієї дисципліни та поточний семестр студента (для оцінки).
  // Оцінок, профілю та інших академічних даних студента викладач не отримує.
  // Якщо студента не зіставлено або джерело недоступне, available = false.
  async function getResultOptions(studentId, subjectId) {
    const externalId = await findExternalId(studentId);
    if (!externalId || !subjectId) {
      return {
        mapped: Boolean(externalId),
        available: Boolean(externalId),
        debts: [],
        semester: null,
      };
    }
    try {
      const [debts, profile] = await Promise.all([
        loadDebts(studentId, externalId),
        callOrFail('getStudentProfile', academicProfileSchema, externalId),
      ]);
      return {
        mapped: true,
        available: true,
        debts: debts
          .filter((debt) => debt.status === 'open' && debt.subject.id === subjectId)
          .map(({ id, debtType, description, deadline }) => ({
            id,
            debtType,
            description,
            deadline,
          })),
        semester: profile ? currentSemester(profile.course) : null,
      };
    } catch (err) {
      if (err instanceof AppError && err.code === 'ACADEMIC_PROVIDER_UNAVAILABLE') {
        return { mapped: true, available: false, debts: [], semester: null };
      }
      throw err;
    }
  }

  // FR-31: розклад занять за календарні дні from – to (дати Europe/Kyiv, до 31 доби),
  // лише заняття цього періоду, упорядковані за часом початку
  function getMySchedule(user, { from, to }) {
    return respond(user, async (externalId) => {
      const start = zonedTimeToUtc(from, '00:00');
      const end = zonedTimeToUtc(addDays(to, 1), '00:00');
      const entries = await callOrFail('getStudentSchedule', classScheduleSchema, externalId, {
        from: start,
        to: end,
      });
      const inPeriod = entries
        .filter((entry) => Date.parse(entry.startAt) >= start && Date.parse(entry.startAt) < end)
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id));
      const withSubjects = await attachSubjects(inPeriod);
      return withSubjects.map((entry) => ({
        id: entry.id,
        startAt: entry.startAt,
        endAt: entry.endAt,
        subject: entry.subject,
        classType: entry.classType,
        teacherName: entry.teacherName,
        location: entry.location,
      }));
    });
  }

  // FR-34, FR-36: перевірка накладок слотів із розкладом студента. Для інших ролей слоти
  // повертаються без змін. Незіставлений студент або збій постачальника → UNAVAILABLE.
  async function checkSlots(user, slots) {
    if (user.role !== 'STUDENT') return slots;
    if (slots.length === 0) return [];
    const markAll = (scheduleCheck) =>
      slots.map((slot) => ({ ...slot, scheduleCheck, conflicts: [] }));

    const externalId = await findExternalId(user.id);
    if (!externalId) return markAll(SCHEDULE_CHECK.UNAVAILABLE);

    let classes;
    try {
      const from = new Date(Math.min(...slots.map((slot) => slot.startAt.getTime())));
      const to = new Date(Math.max(...slots.map((slot) => slot.endAt.getTime())));
      classes = await loadSchedule(externalId, from, to);
    } catch (err) {
      if (err instanceof AcademicProviderError) return markAll(SCHEDULE_CHECK.UNAVAILABLE);
      throw err;
    }

    return slots.map((slot) => {
      const conflicts = classes
        .filter((entry) => overlaps(slot, entry))
        .sort((a, b) => a.startAt - b.startAt)
        .map((entry) => ({
          subjectName: entry.subjectName,
          classType: entry.classType,
          startAt: entry.startAt.toISOString(),
          endAt: entry.endAt.toISOString(),
        }));
      return {
        ...slot,
        scheduleCheck: conflicts.length > 0 ? SCHEDULE_CHECK.CONFLICT : SCHEDULE_CHECK.OK,
        conflicts,
      };
    });
  }

  // Перевірка одного слота перед бронюванням (FR-35)
  async function checkSlot(user, slot) {
    const [checked] = await checkSlots(user, [slot]);
    return { scheduleCheck: checked.scheduleCheck, conflicts: checked.conflicts };
  }

  // FR-40: стан академічної інтеграції для /api/admin/stats (без академічних даних студентів)
  async function getAdminSummary() {
    const [status, subjectsTotal, linkedStudents, linkedTeachers] = await Promise.all([
      getStatus({ id: 0 }),
      prisma.subject.count(),
      prisma.academicDataMapping.count({ where: { provider: name, user: { role: 'STUDENT' } } }),
      prisma.academicDataMapping.count({ where: { provider: name, user: { role: 'TEACHER' } } }),
    ]);
    const { provider, isDemo, dataAsOf, available } = status.data;
    return { provider, isDemo, dataAsOf, available, subjectsTotal, linkedStudents, linkedTeachers };
  }

  return {
    name,
    getStatus,
    getMyProfile,
    getMyRecords,
    getMyDebts,
    getMySchedule,
    getResultOptions,
    checkSlots,
    checkSlot,
    getAdminSummary,
  };
}
