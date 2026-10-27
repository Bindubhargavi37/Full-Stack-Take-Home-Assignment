import type { Role } from 'shared';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware: the logged-in user, freshly loaded from the database. */
      user?: {
        id: string;
        role: Role;
        email: string;
        fullName: string;
        adminId: string | null;
      };
    }
  }
}

export {};
