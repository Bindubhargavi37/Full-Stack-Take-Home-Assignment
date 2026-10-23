import type { RequestHandler } from 'express';
import type { ChangePasswordInput, UpdatePreferencesInput } from 'shared';
import * as userService from '../services/user.service';
import { setAuthCookies } from '../utils/cookies';
import { clientMeta } from './auth.controller';

export const changePassword: RequestHandler = async (req, res) => {
  const tokens = await userService.changePassword(
    req.user!.id,
    req.body as ChangePasswordInput,
    clientMeta(req),
  );
  setAuthCookies(res, tokens);
  res.json({
    success: true,
    data: { message: 'Password changed. Other devices were signed out.' },
  });
};

export const updatePreferences: RequestHandler = async (req, res) => {
  const user = await userService.updatePreferences(
    req.user!.id,
    req.body as UpdatePreferencesInput,
  );
  res.json({ success: true, data: { user } });
};
