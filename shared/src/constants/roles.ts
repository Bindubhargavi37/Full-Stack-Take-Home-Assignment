export const ROLES = ['ADMIN', 'AGENT'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  AGENT: 'Agent',
};
