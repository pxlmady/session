import * as adminService from '../services/admin.service.js';

// FR-25
export async function stats(req, res) {
  res.json(await adminService.getStats(req.app.locals.academic));
}

// FR-26
export async function listUsers(_req, res) {
  res.json(await adminService.listUsers());
}

// FR-26: формат відповіді { user }, як у PATCH /api/users/me
export async function changeRole(req, res) {
  const user = await adminService.changeUserRole(req.user, req.validated.params.id, req.body.role);
  res.json({ user });
}
