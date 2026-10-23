import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';
import { authRouter } from './auth.routes';
import { submissionRouter } from './submission.routes';
import { userRouter } from './user.routes';

// Every API route is mounted here, under /api/v1 (see app.ts).
export const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/submissions', submissionRouter);
