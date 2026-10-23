import type { AuthUser, ChangePasswordInput, LoginInput, Theme } from 'shared';
import { api, ApiError } from '@/lib/apiClient';

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { user } = await api<{ user: AuthUser }>('/auth/me');
    return user;
  } catch (error) {
    // Not signed in is a normal state, not an error.
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: input });
  return user;
}

export function logout(): Promise<void> {
  return api<void>('/auth/logout', { method: 'POST' });
}

export function changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
  return api('/users/me/password', { method: 'PATCH', body: input });
}

export async function saveThemePreference(themePreference: Theme): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>('/users/me/preferences', {
    method: 'PATCH',
    body: { themePreference },
  });
  return user;
}
