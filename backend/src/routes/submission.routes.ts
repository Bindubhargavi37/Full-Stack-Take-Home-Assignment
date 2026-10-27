import { Router } from 'express';
import {
  changeStatusSchema,
  idParamsSchema,
  listSubmissionsQuerySchema,
  recordPaymentSchema,
  submissionFormSchema,
} from 'shared';
import * as submissionController from '../controllers/submission.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

// Every route is scoped in the service: agents reach only their own submissions,
// admins only those of their own agents. Anything outside the scope is a 404.
export const submissionRouter = Router();

submissionRouter.use(authenticate);

submissionRouter.get(
  '/',
  validate({ query: listSubmissionsQuerySchema }),
  submissionController.list,
);
submissionRouter.post(
  '/',
  authorize('AGENT'),
  validate({ body: submissionFormSchema }),
  submissionController.create,
);
submissionRouter.get('/:id', validate({ params: idParamsSchema }), submissionController.getOne);
submissionRouter.get(
  '/:id/history',
  validate({ params: idParamsSchema }),
  submissionController.history,
);
submissionRouter.patch(
  '/:id',
  authorize('AGENT'),
  validate({ params: idParamsSchema, body: submissionFormSchema }),
  submissionController.resubmit,
);
submissionRouter.post(
  '/:id/payments',
  validate({ params: idParamsSchema, body: recordPaymentSchema }),
  submissionController.recordPayment,
);
submissionRouter.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate({ params: idParamsSchema, body: changeStatusSchema }),
  submissionController.changeStatus,
);
