import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { AuthUser, LoginInput } from 'shared';
import * as authApi from '@/api/auth.api';
import { setSessionExpiredHandler } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // On first load, ask the server who is signed in (the cookies are sent automatically).
  const { data: user = null, isPending } = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: authApi.fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  });

  const setUser = useCallback(
    (next: AuthUser | null) => queryClient.setQueryData(queryKeys.currentUser, next),
    [queryClient],
  );

  /** Marks the user as signed out and drops every other cached response, so the next
   *  person on this computer can't see the previous user's data. */
  const endSession = useCallback(() => {
    setUser(null);
    queryClient.removeQueries({
      predicate: (query) => query.queryKey !== queryKeys.currentUser,
    });
  }, [queryClient, setUser]);

  // If a session can't be renewed mid-use, sign out locally so the login page shows.
  // (On first load nobody is signed in yet; the session check handles that case itself.)
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (queryClient.getQueryData(queryKeys.currentUser)) endSession();
    });
  }, [queryClient, endSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const signedIn = await authApi.login(input);
      setUser(signedIn);
      return signedIn;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      endSession();
    }
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading: isPending, login, logout, setUser }),
    [user, isPending, login, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
