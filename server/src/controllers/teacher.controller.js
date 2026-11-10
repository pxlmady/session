import * as teacherService from '../services/teacher.service.js';

// FR-13, FR-32
export async function list(req, res) {
  res.json(await teacherService.listTeachers(req.validated.query));
}

// FR-32
export async function getById(req, res) {
  res.json(await teacherService.getTeacher(req.validated.params.id));
}

// FR-14, FR-34
export async function freeSlots(req, res) {
  res.json(
    await teacherService.listFreeSlots(req.validated.params.id, req.user, req.app.locals.academic),
  );
}
