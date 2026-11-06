import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import {
  buildEmails,
  flushNotifications,
  NOTIFICATION_EVENTS,
  setMailTransport,
} from '../src/services/notification.service.js';
import { sendDueReminders } from '../src/services/reminder.service.js';
import { createUserWithToken, futureRange, resetDatabase } from './helpers.js';

const app = createApp();
const TOPIC = 'Питання щодо структури курсової роботи';
const HOUR = 60 * 60 * 1000;

// Тестовий транспорт: запам'ятовує листи замість надсилання
function recordingTransport() {
  const sent = [];
  return { sent, sendMail: async (message) => sent.push(message) };
}

const failingTransport = {
  sendMail: async () => {
    throw new Error('SMTP недоступний');
  },
};

let mail;
let teacher;
let student;
let slot;

beforeEach(async () => {
  await resetDatabase();
  mail = recordingTransport();
  setMailTransport(mail);
  teacher = await createUserWithToken({
    role: 'TEACHER',
    email: 'teacher@test.local',
    fullName: 'Викладач Тестовий',
  });
  student = await createUserWithToken({
    role: 'STUDENT',
    email: 'student@test.local',
    fullName: 'Студент Тестовий',
    studentGroup: 'ТЦР-41',
  });
  slot = (
    await request(app)
      .post('/api/slots')
      .set(teacher.auth)
      .send({ ...futureRange(3), location: 'Ауд. 101' })
      .expect(201)
  ).body;
});

afterAll(async () => {
  await resetDatabase();
  setMailTransport();
  await prisma.$disconnect();
});

const book = async () =>
  (
    await request(app)
      .post('/api/bookings')
      .set(student.auth)
      .send({ slotId: slot.id, topic: TOPIC })
      .expect(201)
  ).body;

// Листи, надіслані у фоні після попередніх дій
async function sentMail() {
  await flushNotifications();
  return mail.sent.map(({ to, subject }) => ({ to, subject }));
}

async function clearMail() {
  await flushNotifications();
  mail.sent.length = 0;
}

describe('формування листів', () => {
  const booking = {
    id: 1,
    topic: TOPIC,
    status: 'PENDING',
    slot: {
      startAt: new Date('2026-11-10T10:00:00Z'),
      endAt: new Date('2026-11-10T10:30:00Z'),
      location: null,
      teacher: { fullName: 'Викладач Тестовий', email: 'teacher@test.local' },
    },
    student: { fullName: 'Студент Тестовий', email: 'student@test.local', studentGroup: 'ТЦР-41' },
  };

  test('лист містить учасників, час у Europe/Kyiv, місце і тему', () => {
    const [toTeacher, toStudent] = buildEmails(NOTIFICATION_EVENTS.BOOKING_CREATED, booking);
    expect(toTeacher.to).toBe('teacher@test.local');
    expect(toStudent.to).toBe('student@test.local');
    expect(toTeacher.subject).toBe('Session: новий запис на консультацію');
    expect(toTeacher.text).toContain('Вітаємо, Викладач Тестовий!');
    expect(toTeacher.text).toContain('Студент: Студент Тестовий (ТЦР-41)');
    // 10:00 UTC у листопаді – 12:00 за київським часом
    expect(toTeacher.text).toMatch(/Час: 10 листопада 2026.*12:00 – 12:30 \(Europe\/Kyiv\)/);
    expect(toTeacher.text).toContain('Місце: не вказано');
    expect(toTeacher.text).toContain(`Тема: ${TOPIC}`);
  });

  test.each([
    [NOTIFICATION_EVENTS.BOOKING_CONFIRMED, {}, ['student@test.local']],
    [NOTIFICATION_EVENTS.BOOKING_REJECTED, {}, ['student@test.local']],
    [NOTIFICATION_EVENTS.BOOKING_CANCELLED, { cancelledBy: 'STUDENT' }, ['teacher@test.local']],
    [NOTIFICATION_EVENTS.BOOKING_CANCELLED, { cancelledBy: 'TEACHER' }, ['student@test.local']],
    [NOTIFICATION_EVENTS.SLOT_CANCELLED, {}, ['student@test.local']],
    [NOTIFICATION_EVENTS.REMINDER, {}, ['teacher@test.local', 'student@test.local']],
  ])('%s %o → отримувачі %o', (event, options, recipients) => {
    expect(buildEmails(event, booking, options).map((m) => m.to)).toEqual(recipients);
  });
});

describe('сповіщення про операції з записами', () => {
  test('створення запису – лист викладачу і студенту', async () => {
    await book();
    expect(await sentMail()).toEqual([
      { to: 'teacher@test.local', subject: 'Session: новий запис на консультацію' },
      { to: 'student@test.local', subject: 'Session: запис на консультацію створено' },
    ]);
    expect(mail.sent[0].text).toContain('Місце: Ауд. 101');
  });

  test('підтвердження і скасування викладачем – листи студенту', async () => {
    const booking = await book();
    await clearMail();

    await request(app).patch(`/api/bookings/${booking.id}/confirm`).set(teacher.auth).expect(200);
    await request(app).patch(`/api/bookings/${booking.id}/cancel`).set(teacher.auth).expect(200);
    expect(await sentMail()).toEqual([
      { to: 'student@test.local', subject: 'Session: запис підтверджено' },
      { to: 'student@test.local', subject: 'Session: запис скасовано викладачем' },
    ]);
  });

  test('відхилення – лист студенту; скасування студентом – лист викладачу', async () => {
    const first = await book();
    await clearMail();
    await request(app).patch(`/api/bookings/${first.id}/reject`).set(teacher.auth).expect(200);
    expect(await sentMail()).toEqual([
      { to: 'student@test.local', subject: 'Session: запис відхилено' },
    ]);

    const second = await book();
    await clearMail();
    await request(app).patch(`/api/bookings/${second.id}/cancel`).set(student.auth).expect(200);
    expect(await sentMail()).toEqual([
      { to: 'teacher@test.local', subject: 'Session: запис скасовано студентом' },
    ]);
  });

  test('скасування слота з активним записом – лист студенту', async () => {
    await book();
    await clearMail();

    await request(app).delete(`/api/slots/${slot.id}`).set(teacher.auth).expect(200);
    expect(await sentMail()).toEqual([
      { to: 'student@test.local', subject: 'Session: консультацію скасовано' },
    ]);
  });

  test('видалення слота без записів листів не надсилає', async () => {
    await request(app).delete(`/api/slots/${slot.id}`).set(teacher.auth).expect(204);
    expect(await sentMail()).toEqual([]);
  });

  test('помилка надсилання email не скасовує бронювання і зміну статусу', async () => {
    setMailTransport(failingTransport);
    const booking = await book();
    await request(app).patch(`/api/bookings/${booking.id}/confirm`).set(teacher.auth).expect(200);
    await flushNotifications();

    const stored = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, slot: { select: { status: true } } },
    });
    expect(stored).toEqual({ status: 'CONFIRMED', slot: { status: 'BOOKED' } });
  });
});

describe('нагадування за ~24 години (node-cron)', () => {
  const startAt = () => new Date(slot.startAt).getTime();

  async function confirmedBooking() {
    const booking = await book();
    await request(app).patch(`/api/bookings/${booking.id}/confirm`).set(teacher.auth).expect(200);
    await clearMail();
    return booking;
  }

  test('нагадування отримують обидва учасники лише один раз', async () => {
    const booking = await confirmedBooking();
    const now = new Date(startAt() - 20 * HOUR);

    expect(await sendDueReminders(now)).toBe(1);
    expect(mail.sent.map((m) => m.to)).toEqual(['teacher@test.local', 'student@test.local']);
    expect(mail.sent[0].subject).toBe('Session: нагадування про консультацію');
    const stored = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(stored.reminderSentAt).toEqual(now);

    // Повторна перевірка нагадування не дублює
    expect(await sendDueReminders(new Date(startAt() - 19 * HOUR))).toBe(0);
    expect(mail.sent).toHaveLength(2);
  });

  test('немає нагадування, якщо до початку понад 24 години або консультація почалася', async () => {
    await confirmedBooking();
    expect(await sendDueReminders(new Date(startAt() - 25 * HOUR))).toBe(0);
    expect(await sendDueReminders(new Date(startAt() + HOUR))).toBe(0);
    expect(mail.sent).toEqual([]);
  });

  test('непідтверджений або скасований запис нагадування не отримує', async () => {
    const booking = await book();
    await clearMail();
    const now = new Date(startAt() - 20 * HOUR);
    expect(await sendDueReminders(now)).toBe(0);

    await request(app).patch(`/api/bookings/${booking.id}/cancel`).set(student.auth).expect(200);
    await clearMail();
    expect(await sendDueReminders(now)).toBe(0);
    expect(mail.sent).toEqual([]);
  });

  test('збій пошти під час нагадування не генерує помилку', async () => {
    await confirmedBooking();
    setMailTransport(failingTransport);
    await expect(sendDueReminders(new Date(startAt() - 20 * HOUR))).resolves.toBe(0);
  });
});
