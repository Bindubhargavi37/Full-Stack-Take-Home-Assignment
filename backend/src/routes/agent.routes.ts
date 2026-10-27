import { Router } from 'express';
import {
  agentStatusSchema,
  createAgentSchema,
  idParamsSchema,
  listAgentsQuerySchema,
  resetAgentPasswordSchema,
  updateAgentSchema,
} from 'shared';
import * as agentController from '../controllers/agent.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

// Admins manage only their own agents. Another admin's agent is a 404.
export const agentRouter = Router();

agentRouter.use(authenticate, authorize('ADMIN'));

agentRouter.get('/', validate({ query: listAgentsQuerySchema }), agentController.list);
// Registered before '/:id', so "options" is not read as an id.
agentRouter.get('/options', agentController.options);
agentRouter.post('/', validate({ body: createAgentSchema }), agentController.create);
agentRouter.get('/:id', validate({ params: idParamsSchema }), agentController.getOne);
agentRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateAgentSchema }),
  agentController.update,
);
agentRouter.patch(
  '/:id/status',
  validate({ params: idParamsSchema, body: agentStatusSchema }),
  agentController.setStatus,
);
agentRouter.post(
  '/:id/reset-password',
  validate({ params: idParamsSchema, body: resetAgentPasswordSchema }),
  agentController.resetPassword,
);
