import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { MockAcademicProvider } from '../src/academic/index.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createUserWithToken, expectErrorFormat, resetDatabase } from './helpers.js';

// Етап 8. Академічна інтеграція, серверна частина (ТЗ п. 4.1.5, TC-14 – TC-24)

const app = createApp();
const mock = new MockAcademicProvider();
const TOPIC = 'Бази даних: повторне складання екзамену';
const ACADEMIC_ME = ['profile', 'records', 'debts', 'schedule?from=2026-11-16&to=2026-11-22'];

let student; // зіставлений з DEMO-S-1001 (Група 1)
let unlinkedStudent;
let teacher; // DEMO-T-01: Вебпрограмування, Бази даних, Інженерія ПЗ
let otherTeacher; // DEMO-T-02: Алгоритми, Вища математика, Інженерія ПЗ
let admin;
let subjects; // externalId → { id, name }

const link = (who, externalId) =>
  prisma.academicDataMapping.create({
    data: { userId: who.user.id, provider: 'mock', externalId },
  });

async function linkTeacherSubjects(who, externalId) {
  const ids = await mock.getTeacherSubjects(externalId);
  await prisma.teacherSubject.createMany({
    data: ids.map((id) => ({ teacherId: who.user.id, subjectId: subjects[id].id })),
  });
}

beforeEach(async () => {
  await resetDatabase();
  subjects = {};
  for (const { externalId, name } of await mock.listSubjects()) {
    const subject = await prisma.subject.create({ data: { externalId, name } });
    subjects[externalId] = { id: subject.id, name };
  }
  student = await createUserWithToken({ role: 'STUDENT', email: 's1@test.local' });
  unlinkedStudent = await createUserWithToken({ role: 'STUDENT', email: 's2@test.local' });
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 't1@test.local',
    fullName: 'Викладач Перший',
  });
  otherTeacher = await createUserWithToken({
    role: 'TEACHER',
    email: 't2@test.local',
    fullName: 'Викладач Другий',
  });
  admin = await createUserWithToken({ role: 'ADMIN', email: 'admin@test.local' });
  await link(student, 'DEMO-S-1001');
  await link(teacher, 'DEMO-T-01');
  await link(otherTeacher, 'DEMO-T-02');
  await linkTeacherSubjects(teacher, 'DEMO-T-01');
  await linkTeacherSubjects(otherTeacher, 'DEMO-T-02');
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

// Найближче заняття студента DEMO-S-1001, що починається не раніше ніж через добу
async function nextClass() {
  const from = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const to = new Date(from.getTime() + 8 * 24 * 60 * 60 * 1000);
  const [entry] = await mock.getStudentSchedule('DEMO-S-1001', { from, to });
  return { ...entry, startAt: new Date(entry.startAt), endAt: new Date(entry.endAt) };
}

const createSlot = (startAt, minutes, teacherId = teacher.user.id) =>
  prisma.slot.create({
    data: { teacherId, startAt, endAt: new Date(startAt.getTime() + minutes * 60 * 1000) },
  });

// Слот, що перетинається із заняттям, і слот, що починається одразу після нього
async function conflictAndAdjacentSlots() {
  const lesson = await nextClass();
  const conflict = await createSlot(new Date(lesson.startAt.getTime() + 20 * 60 * 1000), 30);
  const adjacent = await createSlot(lesson.endAt, 10);
  return { lesson, conflict, adjacent };
}

const freeSlots = (who, appInstance = app) =>
  request(appInstance).get(`/api/teachers/${teacher.user.id}/slots`).set(who.auth);

const book = (who, body, appInstance = app) =>
  request(appInstance)
    .post('/api/bookings')
    .set(who.auth)
    .send({ topic: TOPIC, ...body });

const slotStatus = async (id) => (await prisma.slot.findUnique({ where: { id } })).status;

const DEMO_META = { provider: 'mock', isDemo: true, dataAsOf: expect.any(String) };

describe('TC-14: академічні дані зіставленого студента (FR-27 – FR-31, FR-37)', () => {
  test('профіль відповідає fixtures, відповідь містить meta.isDemo = true', async () => {
    const res = await request(app).get('/api/academic/me/profile').set(student.auth).expect(200);
    expect(res.body).toEqual({
      data: {
        group: 'Група 1',
        institute: expect.any(String),
        specialty: 'Інженерія програмного забезпечення',
        course: 3,
        studyForm: 'Денна',
        averageScore: 78.4,
      },
      meta: DEMO_META,
    });
  });

  test('оцінки: усі семестри та фільтр за семестром, дисципліна з довідника Session', async () => {
    const all = await request(app).get('/api/academic/me/records').set(student.auth).expect(200);
    expect(all.body.meta).toEqual(DEMO_META);
    expect(all.body.data).toHaveLength(6);
    expect(new Set(all.body.data.map((r) => r.semester))).toEqual(new Set([3, 4]));

    const res = await request(app)
      .get('/api/academic/me/records?semester=4')
      .set(student.auth)
      .expect(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.every((record) => record.semester === 4)).toBe(true);
    expect(res.body.data).toContainEqual({
      id: 'R1001-04',
      subject: subjects['DEMO-SUBJ-DB'],
      semester: 4,
      controlType: 'Екзамен',
      score: 52,
      nationalGrade: 'Незадовільно',
      date: '2026-06-12',
    });
  });

  test('заборгованості: за замовчуванням лише відкриті, status=all – усі', async () => {
    const open = await request(app).get('/api/academic/me/debts').set(student.auth).expect(200);
    expect(open.body.meta).toEqual(DEMO_META);
    expect(open.body.data.map((debt) => debt.id)).toEqual(['D1001-02', 'D1001-01']);
    expect(open.body.data[1]).toEqual({
      id: 'D1001-01',
      subject: subjects['DEMO-SUBJ-DB'],
      debtType: expect.any(String),
      description: expect.any(String),
      deadline: '2026-12-15',
      status: 'open',
    });

    const all = await request(app)
      .get('/api/academic/me/debts?status=all')
      .set(student.auth)
      .expect(200);
    expect(all.body.data).toHaveLength(3);
    expect(all.body.data.some((debt) => debt.status === 'closed')).toBe(true);
  });

  test('інший студент бачить лише власні дані', async () => {
    const other = await createUserWithToken({ role: 'STUDENT', email: 's3@test.local' });
    await link(other, 'DEMO-S-1002');
    const res = await request(app).get('/api/academic/me/debts').set(other.auth).expect(200);
    expect(res.body.data.map((debt) => debt.id)).toEqual(['D1002-01']);
  });

  test('стан джерела: доступне, користувач зіставлений', async () => {
    const res = await request(app).get('/api/academic/status').set(student.auth).expect(200);
    expect(res.body).toEqual({
      data: { ...DEMO_META, available: true, linked: true },
      meta: DEMO_META,
    });
  });
});

describe('TC-15: незіставлений студент і інші ролі', () => {
  test.each(ACADEMIC_ME)('/api/academic/me/%s без зіставлення → 404', async (path) => {
    const res = await request(app).get(`/api/academic/me/${path}`).set(unlinkedStudent.auth);
    expectErrorFormat(res, 404, 'ACADEMIC_PROFILE_NOT_LINKED');
  });

  test.each(ACADEMIC_ME)(
    '/api/academic/me/%s для викладача й адміністратора → 403',
    async (path) => {
      for (const who of [teacher, admin]) {
        const res = await request(app).get(`/api/academic/me/${path}`).set(who.auth);
        expectErrorFormat(res, 403, 'FORBIDDEN');
      }
    },
  );

  test('без токена → 401', async () => {
    expectErrorFormat(await request(app).get('/api/academic/me/profile'), 401, 'UNAUTHORIZED');
    expectErrorFormat(await request(app).get('/api/academic/status'), 401, 'UNAUTHORIZED');
  });

  test('стан джерела для незіставленого студента: linked = false', async () => {
    const res = await request(app).get('/api/academic/status').set(unlinkedStudent.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ available: true, linked: false });
  });

  test('невідомі параметри: семестр поза 1–12 і статус заборгованостей → 400', async () => {
    for (const query of ['semester=0', 'semester=13', 'semester=abc']) {
      const res = await request(app).get(`/api/academic/me/records?${query}`).set(student.auth);
      expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    }
    const res = await request(app).get('/api/academic/me/debts?status=closed').set(student.auth);
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
  });
});

describe('TC-16: перевірка періоду розкладу', () => {
  const schedule = (query) =>
    request(app).get(`/api/academic/me/schedule?${query}`).set(student.auth);

  test('to раніше за from → 400', async () => {
    const res = await schedule('from=2026-11-20&to=2026-11-19');
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('to');
  });

  test('період понад 31 добу → 400; рівно 31 доба → 200', async () => {
    expectErrorFormat(await schedule('from=2026-11-01&to=2026-12-02'), 400, 'VALIDATION_ERROR');
    expect((await schedule('from=2026-11-01&to=2026-12-01')).status).toBe(200);
  });

  test('відсутні або некоректні дати → 400', async () => {
    for (const query of [
      '',
      'from=2026-11-16',
      'from=16.11.2026&to=2026-11-17',
      'from=2026-02-30&to=2026-03-01',
    ]) {
      expectErrorFormat(await schedule(query), 400, 'VALIDATION_ERROR');
    }
  });
});

describe('TC-17: склад і порядок розкладу', () => {
  test('один день: лише заняття цього дня, час Europe/Kyiv перетворено в UTC', async () => {
    // 16.11.2026 – понеділок, зимовий час (UTC+2)
    const res = await request(app)
      .get('/api/academic/me/schedule?from=2026-11-16&to=2026-11-16')
      .set(student.auth)
      .expect(200);
    expect(res.body.meta).toEqual(DEMO_META);
    expect(res.body.data).toEqual([
      {
        id: 'G1-MON-1-2026-11-16',
        startAt: '2026-11-16T06:30:00.000Z',
        endAt: '2026-11-16T07:50:00.000Z',
        subject: subjects['DEMO-SUBJ-WEB'],
        classType: 'Лекція',
        teacherName: 'Викладач Тестовий Перший',
        location: 'Аудиторія 101',
      },
      expect.objectContaining({
        id: 'G1-MON-2-2026-11-16',
        startAt: '2026-11-16T08:05:00.000Z',
        classType: 'Лабораторна робота',
      }),
    ]);
  });

  test('літній час (UTC+3) враховується', async () => {
    const res = await request(app)
      .get('/api/academic/me/schedule?from=2026-04-06&to=2026-04-06')
      .set(student.auth)
      .expect(200);
    expect(res.body.data[0].startAt).toBe('2026-04-06T05:30:00.000Z');
  });

  test('тиждень: заняття в межах періоду, упорядковані за часом, без вихідних', async () => {
    const res = await request(app)
      .get('/api/academic/me/schedule?from=2026-11-16&to=2026-11-22')
      .set(student.auth)
      .expect(200);
    const starts = res.body.data.map((entry) => entry.startAt);
    expect(starts).toHaveLength(9);
    expect([...starts].sort()).toEqual(starts);
    expect(starts[0] >= '2026-11-15T22:00:00.000Z').toBe(true);
    expect(starts.at(-1) < '2026-11-22T22:00:00.000Z').toBe(true);
    for (const entry of res.body.data) {
      expect(entry).toEqual({
        id: expect.any(String),
        startAt: expect.any(String),
        endAt: expect.any(String),
        subject: { id: expect.any(Number), name: expect.any(String) },
        classType: expect.any(String),
        teacherName: expect.any(String),
        location: expect.any(String),
      });
    }
  });
});

describe('TC-18: перевірка накладок у списку слотів (FR-34)', () => {
  test('слот, що перетинається, – CONFLICT із переліком занять; суміжний – OK', async () => {
    const { lesson, conflict, adjacent } = await conflictAndAdjacentSlots();
    const res = await freeSlots(student).expect(200);
    const byId = Object.fromEntries(res.body.map((slot) => [slot.id, slot]));

    expect(byId[conflict.id]).toMatchObject({
      scheduleCheck: 'CONFLICT',
      conflicts: [
        {
          subjectName: lesson.subjectName,
          classType: lesson.classType,
          startAt: lesson.startAt.toISOString(),
          endAt: lesson.endAt.toISOString(),
        },
      ],
    });
    expect(byId[adjacent.id]).toMatchObject({ scheduleCheck: 'OK', conflicts: [] });
  });

  test('для викладача й адміністратора полів перевірки немає', async () => {
    await conflictAndAdjacentSlots();
    for (const who of [teacher, admin]) {
      const res = await freeSlots(who).expect(200);
      expect(res.body).toHaveLength(2);
      for (const slot of res.body) {
        expect(slot).not.toHaveProperty('scheduleCheck');
        expect(slot).not.toHaveProperty('conflicts');
      }
    }
  });

  test('незіставлений студент – UNAVAILABLE', async () => {
    await conflictAndAdjacentSlots();
    const res = await freeSlots(unlinkedStudent).expect(200);
    expect(res.body.map((slot) => slot.scheduleCheck)).toEqual(['UNAVAILABLE', 'UNAVAILABLE']);
  });
});

describe('TC-19: бронювання конфліктного слота (FR-35)', () => {
  test('без acknowledgeConflict → 409 SCHEDULE_CONFLICT, слот залишається FREE', async () => {
    const { lesson, conflict } = await conflictAndAdjacentSlots();
    const res = await book(student, { slotId: conflict.id });
    expectErrorFormat(res, 409, 'SCHEDULE_CONFLICT');
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ subjectName: lesson.subjectName }),
    ]);
    expect(await slotStatus(conflict.id)).toBe('FREE');
    expect(await prisma.booking.count()).toBe(0);

    const explicitFalse = await book(student, { slotId: conflict.id, acknowledgeConflict: false });
    expectErrorFormat(explicitFalse, 409, 'SCHEDULE_CONFLICT');
  });

  test('з acknowledgeConflict = true → 201, запис створено', async () => {
    const { conflict } = await conflictAndAdjacentSlots();
    const res = await book(student, { slotId: conflict.id, acknowledgeConflict: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      slotId: conflict.id,
      status: 'PENDING',
      scheduleCheck: 'CONFLICT',
    });
    expect(await slotStatus(conflict.id)).toBe('BOOKED');
  });

  test('acknowledgeConflict не логічного типу → 400', async () => {
    const { conflict } = await conflictAndAdjacentSlots();
    const res = await book(student, { slotId: conflict.id, acknowledgeConflict: 'yes' });
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
  });

  test('зайнятий конфліктний слот → звичайна відповідь 409 SLOT_ALREADY_BOOKED', async () => {
    const { conflict } = await conflictAndAdjacentSlots();
    await book(student, { slotId: conflict.id, acknowledgeConflict: true }).expect(201);
    const res = await book(student, { slotId: conflict.id });
    expectErrorFormat(res, 409, 'SLOT_ALREADY_BOOKED');
  });
});

describe('TC-20: бронювання без накладки або без перевірки', () => {
  test('слот без накладки бронюється без підтвердження (scheduleCheck = OK)', async () => {
    const { adjacent } = await conflictAndAdjacentSlots();
    const res = await book(student, { slotId: adjacent.id });
    expect(res.status).toBe(201);
    expect(res.body.scheduleCheck).toBe('OK');
  });

  test('незіставлений студент бронює слот без перевірки (UNAVAILABLE)', async () => {
    const { conflict } = await conflictAndAdjacentSlots();
    const res = await book(unlinkedStudent, { slotId: conflict.id });
    expect(res.status).toBe(201);
    expect(res.body.scheduleCheck).toBe('UNAVAILABLE');
  });
});

describe('TC-21: збій постачальника академічних даних (FR-36)', () => {
  const failing = {
    name: 'mock',
    getInfo: async () => {
      throw new Error('джерело недоступне');
    },
    getStudentProfile: async () => {
      throw new Error('джерело недоступне');
    },
    getStudentRecords: async () => {
      throw new Error('джерело недоступне');
    },
    getStudentDebts: async () => {
      throw new Error('джерело недоступне');
    },
    getStudentSchedule: async () => {
      throw new Error('джерело недоступне');
    },
    listSubjects: async () => {
      throw new Error('джерело недоступне');
    },
    getTeacherSubjects: async () => {
      throw new Error('джерело недоступне');
    },
  };
  const failingApp = createApp({ academicProvider: failing });

  test.each(ACADEMIC_ME)('/api/academic/me/%s → 503', async (path) => {
    const res = await request(failingApp).get(`/api/academic/me/${path}`).set(student.auth);
    expectErrorFormat(res, 503, 'ACADEMIC_PROVIDER_UNAVAILABLE');
  });

  test('незіставлений студент і під час збою отримує 404', async () => {
    const res = await request(failingApp).get('/api/academic/me/profile').set(unlinkedStudent.auth);
    expectErrorFormat(res, 404, 'ACADEMIC_PROFILE_NOT_LINKED');
  });

  test('стан джерела: 200, available = false', async () => {
    const res = await request(failingApp).get('/api/academic/status').set(student.auth).expect(200);
    expect(res.body.data).toEqual({
      provider: 'mock',
      isDemo: null,
      dataAsOf: null,
      available: false,
      linked: true,
    });
  });

  test('слоти – UNAVAILABLE, бронювання конфліктного слота успішне (201)', async () => {
    const { conflict } = await conflictAndAdjacentSlots();
    const slots = await freeSlots(student, failingApp).expect(200);
    expect(slots.body.map((slot) => slot.scheduleCheck)).toEqual(['UNAVAILABLE', 'UNAVAILABLE']);

    const res = await book(student, { slotId: conflict.id }, failingApp);
    expect(res.status).toBe(201);
    expect(res.body.scheduleCheck).toBe('UNAVAILABLE');
    expect(await slotStatus(conflict.id)).toBe('BOOKED');
  });

  test('перевищення часу очікування → 503', async () => {
    const slow = new MockAcademicProvider();
    slow.getStudentProfile = () => new Promise(() => {});
    const slowApp = createApp({ academicProvider: slow, academicTimeoutMs: 50 });
    const res = await request(slowApp).get('/api/academic/me/profile').set(student.auth);
    expectErrorFormat(res, 503, 'ACADEMIC_PROVIDER_UNAVAILABLE');
  });

  test('дані, що не відповідають схемі, → 503', async () => {
    const broken = new MockAcademicProvider();
    broken.getStudentRecords = async () => [{ id: 1, score: 'відмінно' }];
    const brokenApp = createApp({ academicProvider: broken });
    const res = await request(brokenApp).get('/api/academic/me/records').set(student.auth);
    expectErrorFormat(res, 503, 'ACADEMIC_PROVIDER_UNAVAILABLE');
  });

  test('стан інтеграції в статистиці адміністратора: available = false', async () => {
    const res = await request(failingApp).get('/api/admin/stats').set(admin.auth).expect(200);
    expect(res.body.academic).toMatchObject({ provider: 'mock', available: false });
  });
});

describe('TC-22: дисципліни і викладачі (FR-32)', () => {
  test('GET /api/teachers?subjectId= повертає лише викладачів дисципліни', async () => {
    const web = await request(app)
      .get(`/api/teachers?subjectId=${subjects['DEMO-SUBJ-WEB'].id}`)
      .set(student.auth)
      .expect(200);
    expect(web.body.map((t) => t.id)).toEqual([teacher.user.id]);

    const se = await request(app)
      .get(`/api/teachers?subjectId=${subjects['DEMO-SUBJ-SE'].id}`)
      .set(student.auth)
      .expect(200);
    expect(se.body.map((t) => t.id).sort()).toEqual([teacher.user.id, otherTeacher.user.id].sort());
  });

  test('фільтр за неіснуючою дисципліною → 404, некоректний subjectId → 400', async () => {
    expectErrorFormat(
      await request(app).get('/api/teachers?subjectId=999999').set(student.auth),
      404,
      'SUBJECT_NOT_FOUND',
    );
    expectErrorFormat(
      await request(app).get('/api/teachers?subjectId=abc').set(student.auth),
      400,
      'VALIDATION_ERROR',
    );
  });

  test('GET /api/subjects/:id повертає дисципліну з викладачами; неіснуюча – 404', async () => {
    const res = await request(app)
      .get(`/api/subjects/${subjects['DEMO-SUBJ-SE'].id}`)
      .set(teacher.auth)
      .expect(200);
    expect(res.body).toEqual({
      id: subjects['DEMO-SUBJ-SE'].id,
      name: 'Інженерія програмного забезпечення',
      teachers: [
        { id: otherTeacher.user.id, fullName: 'Викладач Другий', department: null },
        { id: teacher.user.id, fullName: 'Викладач Перший', department: null },
      ],
    });
    expectErrorFormat(
      await request(app).get('/api/subjects/999999').set(student.auth),
      404,
      'SUBJECT_NOT_FOUND',
    );
  });

  test('GET /api/subjects: довідник за назвою з пошуком і кількістю викладачів', async () => {
    const all = await request(app).get('/api/subjects').set(student.auth).expect(200);
    expect(all.body).toHaveLength(5);
    expect(all.body.map((s) => s.name)).toEqual(
      Object.values(subjects)
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b, 'uk')),
    );
    const res = await request(app).get('/api/subjects?search=бази').set(student.auth).expect(200);
    expect(res.body).toEqual([
      { id: subjects['DEMO-SUBJ-DB'].id, name: 'Бази даних', teachersCount: 1 },
    ]);
  });

  test('GET /api/teachers/:id – викладач із дисциплінами; не викладач – 404', async () => {
    const res = await request(app)
      .get(`/api/teachers/${teacher.user.id}`)
      .set(student.auth)
      .expect(200);
    expect(res.body).toEqual({
      id: teacher.user.id,
      fullName: 'Викладач Перший',
      department: null,
      subjects: [subjects['DEMO-SUBJ-WEB'], subjects['DEMO-SUBJ-DB'], subjects['DEMO-SUBJ-SE']]
        .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
        .map(({ id, name }) => ({ id, name })),
    });
    expectErrorFormat(
      await request(app).get(`/api/teachers/${student.user.id}`).set(student.auth),
      404,
      'TEACHER_NOT_FOUND',
    );
  });

  test('довідник дисциплін вимагає автентифікації', async () => {
    expectErrorFormat(await request(app).get('/api/subjects'), 401, 'UNAUTHORIZED');
  });
});

describe('TC-23: дисципліна в записі (FR-33, FR-39)', () => {
  test('subjectId зберігається і повертається в «Мої записи» студенту й викладачу', async () => {
    const { adjacent } = await conflictAndAdjacentSlots();
    const subject = subjects['DEMO-SUBJ-DB'];
    const res = await book(student, { slotId: adjacent.id, subjectId: subject.id });
    expect(res.status).toBe(201);
    expect(res.body.subjectId).toBe(subject.id);

    for (const who of [student, teacher]) {
      const list = await request(app).get('/api/bookings/my').set(who.auth).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ subjectId: subject.id, subject });
    }
  });

  test('неіснуючий subjectId → 404 SUBJECT_NOT_FOUND, слот залишається FREE', async () => {
    const { adjacent } = await conflictAndAdjacentSlots();
    const res = await book(student, { slotId: adjacent.id, subjectId: 999999 });
    expectErrorFormat(res, 404, 'SUBJECT_NOT_FOUND');
    expect(await slotStatus(adjacent.id)).toBe('FREE');
  });

  test('некоректний subjectId → 400', async () => {
    const { adjacent } = await conflictAndAdjacentSlots();
    const res = await book(student, { slotId: adjacent.id, subjectId: 'Бази даних' });
    expectErrorFormat(res, 400, 'VALIDATION_ERROR');
  });
});

describe('TC-24: академічні дані не передаються викладачу й адміністратору (FR-39, FR-40)', () => {
  const ACADEMIC_FIELDS = /nationalGrade|debtType|averageScore|scheduleCheck|conflicts|classType/;

  test('відповіді викладачу не містять оцінок, заборгованостей і розкладу студента', async () => {
    const { conflict } = await conflictAndAdjacentSlots();
    await book(student, {
      slotId: conflict.id,
      subjectId: subjects['DEMO-SUBJ-DB'].id,
      acknowledgeConflict: true,
    }).expect(201);

    for (const path of ['/api/bookings/my', '/api/slots/my']) {
      const res = await request(app).get(path).set(teacher.auth).expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(ACADEMIC_FIELDS);
    }
  });

  test('стан академічної інтеграції в /api/admin/stats – лише адміністратору', async () => {
    const res = await request(app).get('/api/admin/stats').set(admin.auth).expect(200);
    expect(res.body.academic).toEqual({
      provider: 'mock',
      isDemo: true,
      dataAsOf: expect.any(String),
      available: true,
      subjectsTotal: 5,
      linkedStudents: 1,
      linkedTeachers: 2,
    });
    expect(JSON.stringify(res.body)).not.toMatch(ACADEMIC_FIELDS);

    for (const who of [student, teacher]) {
      expectErrorFormat(await request(app).get('/api/admin/stats').set(who.auth), 403, 'FORBIDDEN');
    }
  });
});

describe('Конфігурація постачальника (ACADEMIC_PROVIDER)', () => {
  test('невідоме значення зупиняє запуск сервера', () => {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', "await import('./src/config/env.js')"],
      { env: { ...process.env, ACADEMIC_PROVIDER: 'e-rozklad' }, encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/ACADEMIC_PROVIDER=e-rozklad/);
  });
});
