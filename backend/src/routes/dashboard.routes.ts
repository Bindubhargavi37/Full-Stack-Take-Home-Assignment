import { Router } from 'express';
import { dashboardQuerySchema } from 'shared';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';

// Both roles use the same endpoint; the service decides whose data it covers.
export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  authenticate,
  validate({ query: dashboardQuerySchema }),
  dashboardController.summary,
);
