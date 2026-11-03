import * as userService from '../services/user.service.js';

// FR-07: формат відповіді такий самий, як у GET /api/auth/me (FR-06)
export async function updateMe(req, res) {
  const user = await userService.updateProfile(req.user, req.body);
  res.json({ user });
}
