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
  topic: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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
