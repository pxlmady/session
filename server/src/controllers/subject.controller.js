import * as subjectService from '../services/subject.service.js';

// FR-32
export async function list(req, res) {
  res.json(await subjectService.listSubjects(req.validated.query.search));
}

// FR-32
export async function getById(req, res) {
  res.json(await subjectService.getSubject(req.validated.params.id));
}
