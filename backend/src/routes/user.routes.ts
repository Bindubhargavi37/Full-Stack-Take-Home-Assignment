import { Router } from 'express';
import { changePasswordSchema, updatePreferencesSchema, updateProfileSchema } from 'shared';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';

// Routes for the logged-in user's own account. The user id always comes from the token.
export const userRouter = Router();

userRouter.use(authenticate);
userRouter.patch('/me', validate({ body: updateProfileSchema }), userController.updateProfile);
userRouter.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  userController.changePassword,
);
userRouter.patch(
  '/me/preferences',
  validate({ body: updatePreferencesSchema }),
  userController.updatePreferences,
);
