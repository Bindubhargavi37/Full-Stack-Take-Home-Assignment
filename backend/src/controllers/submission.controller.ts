import type { RequestHandler } from 'express';
import type {
  ChangeStatusValues,
  ListSubmissionsQuery,
  RecordPaymentValues,
  SubmissionFormValues,
} from 'shared';
import * as submissionService from '../services/submission.service';
import { idParam } from '../utils/params';

export const list: RequestHandler = async (req, res) => {
  const page = await submissionService.listSubmissions(
    req.user!,
    res.locals.query as ListSubmissionsQuery,
  );
  res.json({ success: true, data: page });
};

export const create: RequestHandler = async (req, res) => {
  const submission = await submissionService.createSubmission(
    req.user!,
    req.body as SubmissionFormValues,
  );
  res.status(201).json({ success: true, data: { submission } });
};

export const getOne: RequestHandler = async (req, res) => {
  const submission = await submissionService.getSubmission(req.user!, idParam(res));
  res.json({ success: true, data: { submission } });
};

export const history: RequestHandler = async (req, res) => {
  const entries = await submissionService.getStatusHistory(req.user!, idParam(res));
  res.json({ success: true, data: { history: entries } });
};

export const resubmit: RequestHandler = async (req, res) => {
  const submission = await submissionService.resubmitSubmission(
    req.user!,
    idParam(res),
    req.body as SubmissionFormValues,
  );
  res.json({ success: true, data: { submission } });
};

export const recordPayment: RequestHandler = async (req, res) => {
  const submission = await submissionService.recordPayment(
    req.user!,
    idParam(res),
    req.body as RecordPaymentValues,
  );
  res.json({ success: true, data: { submission } });
};

export const changeStatus: RequestHandler = async (req, res) => {
  const submission = await submissionService.changeStatus(
    req.user!,
    idParam(res),
    req.body as ChangeStatusValues,
  );
  res.json({ success: true, data: { submission } });
};
