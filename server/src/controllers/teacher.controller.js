import * as teacherService from '../services/teacher.service.js';

// FR-13
export async function list(req, res) {
  res.json(await teacherService.listTeachers(req.validated.query.search));
}

// FR-14
export async function freeSlots(req, res) {
  res.json(await teacherService.listFreeSlots(req.validated.params.id));
}
