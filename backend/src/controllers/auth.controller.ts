import type { Request, RequestHandler } from 'express';
import type { LoginInput } from 'shared';
import * as authService from '../services/auth.service';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../utils/cookies';

export function clientMeta(req: Request): authService.ClientMeta {
  return { userAgent: req.get('user-agent'), ipAddress: req.ip };
}

function refreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

export const login: RequestHandler = async (req, res) => {
  const { user, tokens } = await authService.login(req.body as LoginInput, clientMeta(req));
  setAuthCookies(res, tokens);
  res.json({ success: true, data: { user } });
};

export const refresh: RequestHandler = async (req, res) => {
  try {
    const { user, tokens } = await authService.refreshSession(refreshCookie(req), clientMeta(req));
    setAuthCookies(res, tokens);
    res.json({ success: true, data: { user } });
  } catch (error) {
    // A failed refresh leaves the browser with useless cookies; remove them.
    clearAuthCookies(res);
    throw error;
  }
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(refreshCookie(req));
  clearAuthCookies(res);
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json({ success: true, data: { user } });
};
