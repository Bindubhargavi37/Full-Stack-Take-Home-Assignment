import { z } from 'zod';
import { passwordSchema } from './auth.schema';
import {
  emailSchema,
  optionalPhoneSchema,
  paginationSchema,
  personNameSchema,
} from './common.schema';

// Admin-only agent management. Strict schemas: role, adminId and isActive can never be set
// through these (the server sets role AGENT and adminId = the signed-in admin).

const agentDetails = {
  fullName: personNameSchema('Full name'),
  email: emailSchema,
  phone: optionalPhoneSchema,
};

export const createAgentSchema = z.object({ ...agentDetails, password: passwordSchema }).strict();

export type CreateAgentInput = z.input<typeof createAgentSchema>;
export type CreateAgentValues = z.output<typeof createAgentSchema>;

/** Edit name, email and phone. The password has its own endpoint (reset). */
export const updateAgentSchema = z.object(agentDetails).strict();

export type UpdateAgentInput = z.input<typeof updateAgentSchema>;
export type UpdateAgentValues = z.output<typeof updateAgentSchema>;

export const agentStatusSchema = z
  .object({ isActive: z.boolean({ message: 'isActive must be true or false' }) })
  .strict();

export type AgentStatusInput = z.input<typeof agentStatusSchema>;

/** The admin sets a new password for an agent who forgot theirs. */
export const resetAgentPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z
      .string({ message: 'Please confirm the new password' })
      .min(1, 'Please confirm the new password'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetAgentPasswordInput = z.input<typeof resetAgentPasswordSchema>;

export const AGENT_STATUS_FILTERS = ['active', 'inactive'] as const;

export const listAgentsQuerySchema = paginationSchema
  .extend({
    search: z
      .string()
      .trim()
      .max(100, 'Search must be at most 100 characters')
      .transform((value) => value || undefined)
      .optional(),
    status: z.enum(AGENT_STATUS_FILTERS, { message: 'Unknown status' }).optional(),
  })
  .strict();

export type ListAgentsQuery = z.output<typeof listAgentsQuerySchema>;

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export type Agent = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  submissionCount: number;
};

/** For dropdowns such as the admin's agent filter. */
export type AgentOption = { id: string; fullName: string; isActive: boolean };
