import { createContext } from 'react';
import type { AuthUser, LoginInput } from 'shared';

export type AuthContextValue = {
  /** The signed-in user, or null when signed out. */
  user: AuthUser | null;
  /** True while the app checks for an existing session on first load. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Replaces the cached user after the server returns an updated copy. */
  setUser: (user: AuthUser) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
