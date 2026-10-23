import type { RequestHandler } from 'express';
import type { DashboardQuery } from 'shared';
import * as dashboardService from '../services/dashboard.service';

export const summary: RequestHandler = async (req, res) => {
  const data = await dashboardService.getSummary(req.user!, res.locals.query as DashboardQuery);
  res.json({ success: true, data });
};
