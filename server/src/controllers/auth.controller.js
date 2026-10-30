import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  const user = await authService.register(req.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

// FR-03: дані поточного користувача (req.user заповнює middleware auth)
export function me(req, res) {
  res.json({ user: req.user });
}
