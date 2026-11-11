// Поля, які повертаються через API для слотів і записів (без даних, які клієнту не потрібні)

export const slotSelect = {
  id: true,
  teacherId: true,
  startAt: true,
  endAt: true,
  location: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const bookingSelect = {
  id: true,
  slotId: true,
  studentId: true,
  subjectId: true,
  topic: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

// Результат консультації, який викладач фіксує після її завершення (етап 9б)
// debtClosure – заборгованість, закрита за результатом консультації, або null
export const bookingResultSelect = {
  conductedAt: true,
  teacherNote: true,
  debtClosure: { select: { debtId: true, debtTitle: true, createdAt: true } },
  gradeEntry: {
    select: {
      semester: true,
      controlType: true,
      score: true,
      nationalGrade: true,
      createdAt: true,
    },
  },
};

// Дані студента, які бачить викладач у записах на свої слоти (FR-09)
export const bookingStudentSelect = {
  id: true,
  fullName: true,
  email: true,
  studentGroup: true,
};

// Дані викладача, які бачить студент (FR-13): ПІБ і кафедра
export const teacherSelect = {
  id: true,
  fullName: true,
  department: true,
};
