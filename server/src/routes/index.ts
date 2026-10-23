import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';

// Every API route is mounted here, under /api/v1 (see app.ts).
export const apiRouter = Router();

apiRouter.get('/health', getHealth);
