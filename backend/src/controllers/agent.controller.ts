import type { RequestHandler } from 'express';
import type {
  AgentStatusInput,
  CreateAgentValues,
  ListAgentsQuery,
  ResetAgentPasswordInput,
  UpdateAgentValues,
} from 'shared';
import * as agentService from '../services/agent.service';
import { idParam } from '../utils/params';

// Every route here is admin-only, so req.user is the admin who owns the agents.

export const list: RequestHandler = async (req, res) => {
  const page = await agentService.listAgents(req.user!.id, res.locals.query as ListAgentsQuery);
  res.json({ success: true, data: page });
};

export const options: RequestHandler = async (req, res) => {
  const agents = await agentService.listAgentOptions(req.user!.id);
  res.json({ success: true, data: { agents } });
};

export const getOne: RequestHandler = async (req, res) => {
  const agent = await agentService.getAgent(req.user!.id, idParam(res));
  res.json({ success: true, data: { agent } });
};

export const create: RequestHandler = async (req, res) => {
  const agent = await agentService.createAgent(req.user!.id, req.body as CreateAgentValues);
  res.status(201).json({ success: true, data: { agent } });
};

export const update: RequestHandler = async (req, res) => {
  const agent = await agentService.updateAgent(
    req.user!.id,
    idParam(res),
    req.body as UpdateAgentValues,
  );
  res.json({ success: true, data: { agent } });
};

export const setStatus: RequestHandler = async (req, res) => {
  const agent = await agentService.setAgentActive(
    req.user!.id,
    idParam(res),
    (req.body as AgentStatusInput).isActive,
  );
  res.json({ success: true, data: { agent } });
};

export const resetPassword: RequestHandler = async (req, res) => {
  await agentService.resetAgentPassword(
    req.user!.id,
    idParam(res),
    (req.body as ResetAgentPasswordInput).newPassword,
  );
  res.json({
    success: true,
    data: { message: 'Password reset. The agent was signed out on every device.' },
  });
};
