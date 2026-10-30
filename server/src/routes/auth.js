import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validation/auth.schemas.js';

export function createAuthRouter({ rateLimit } = {}) {
  const router = Router();
  const limiter = authRateLimit(rateLimit);

  router.post('/register', limiter, validate(registerSchema), authController.register);
  router.post('/login', limiter, validate(loginSchema), authController.login);
  router.get('/me', auth, authController.me);

  return router;
}
