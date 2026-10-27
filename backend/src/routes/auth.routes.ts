import { Router } from 'express';
import { loginSchema } from 'shared';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { loginLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticate, authController.me);
