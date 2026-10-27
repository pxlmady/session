// Перевірка обмежень цілісності БД (ТЗ розділ 9.3: BR-01, BR-04, BR-06).
// Усі дії виконуються в одній транзакції, яка наприкінці відкочується: дані в БД не змінюються.
import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const ROLLBACK = Symbol('rollback');
const results = [];

// Виконує дію в точці збереження; очікує помилку з кодом Prisma (P2002 — унікальність, P2003 — FK)
async function expectError(tx, title, expectedCode, action) {
  await tx.$executeRawUnsafe('SAVEPOINT check_step');
  try {
    await action();
    results.push({ title, ok: false, note: 'операцію виконано, хоча мала бути відхилена' });
  } catch (err) {
    results.push({ title, ok: err.code === expectedCode, note: err.code ?? err.message });
  }
  await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT check_step');
}

async function expectSuccess(title, action) {
  await action();
  results.push({ title, ok: true, note: 'виконано' });
}

try {
  await prisma.$transaction(async (tx) => {
    const stamp = Date.now();
    const teacher = await tx.user.create({
      data: {
        email: `check-teacher-${stamp}@session.local`,
        passwordHash: 'x',
        fullName: 'Перевірка Викладач',
        role: 'TEACHER',
      },
    });
    const student = await tx.user.create({
      data: {
        email: `check-student-${stamp}@session.local`,
        passwordHash: 'x',
        fullName: 'Перевірка Студент',
        role: 'STUDENT',
      },
    });
    const other = await tx.user.create({
      data: {
        email: `check-other-${stamp}@session.local`,
        passwordHash: 'x',
        fullName: 'Перевірка Інший',
        role: 'STUDENT',
      },
    });
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slot = await tx.slot.create({
      data: { teacherId: teacher.id, startAt, endAt: new Date(startAt.getTime() + 30 * 60 * 1000) },
    });

    await expectError(tx, 'BR-01: повторний email відхиляється', 'P2002', () =>
      tx.user.create({
        data: { email: student.email, passwordHash: 'x', fullName: 'Дублікат', role: 'STUDENT' },
      }),
    );

    const booking = await tx.booking.create({
      data: { slotId: slot.id, studentId: student.id, topic: 'Тема' },
    });
    results.push({
      title: 'Запис PENDING на вільний слот створюється',
      ok: booking.status === 'PENDING',
      note: booking.status,
    });

    await expectError(
      tx,
      'BR-04: другий активний запис (PENDING) на слот відхиляється',
      'P2002',
      () => tx.booking.create({ data: { slotId: slot.id, studentId: other.id, topic: 'Тема' } }),
    );

    await tx.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } });
    await expectError(tx, 'BR-04: активний запис поруч із CONFIRMED відхиляється', 'P2002', () =>
      tx.booking.create({ data: { slotId: slot.id, studentId: other.id, topic: 'Тема' } }),
    );

    await tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
    await expectSuccess('BR-04: після скасування слот можна забронювати знову', () =>
      tx.booking.create({ data: { slotId: slot.id, studentId: other.id, topic: 'Тема' } }),
    );

    await expectError(tx, 'BR-06: викладача зі слотами видалити не можна', 'P2003', () =>
      tx.user.delete({ where: { id: teacher.id } }),
    );
    await expectError(tx, 'BR-06: студента із записами видалити не можна', 'P2003', () =>
      tx.user.delete({ where: { id: student.id } }),
    );
    await expectError(tx, 'Слот із записами видалити не можна', 'P2003', () =>
      tx.slot.delete({ where: { id: slot.id } }),
    );
    await expectError(tx, 'FK: запис на неіснуючий слот відхиляється', 'P2003', () =>
      tx.booking.create({ data: { slotId: 2147483647, studentId: student.id, topic: 'Тема' } }),
    );

    throw ROLLBACK;
  });
} catch (err) {
  if (err !== ROLLBACK) {
    console.error('Перевірку перервано:', err.message);
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}

for (const { title, ok, note } of results) {
  console.log(`${ok ? '✓' : '✗'} ${title} (${note})`);
}
if (results.some((result) => !result.ok)) process.exitCode = 1;
