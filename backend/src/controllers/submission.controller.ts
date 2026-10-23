import type { RequestHandler } from 'express';
import type {
  ChangeStatusValues,
  ListSubmissionsQuery,
  RecordPaymentValues,
  SubmissionFormValues,
} from 'shared';
import * as submissionService from '../services/submission.service';

// Parsed by the validate middleware before these run.
type IdParams = { id: string };
const idOf = (locals: Record<string, unknown>) => (locals.params as IdParams).id;

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
  const submission = await submissionService.getSubmission(req.user!, idOf(res.locals));
  res.json({ success: true, data: { submission } });
};

export const history: RequestHandler = async (req, res) => {
  const entries = await submissionService.getStatusHistory(req.user!, idOf(res.locals));
  res.json({ success: true, data: { history: entries } });
};

export const resubmit: RequestHandler = async (req, res) => {
  const submission = await submissionService.resubmitSubmission(
    req.user!,
    idOf(res.locals),
    req.body as SubmissionFormValues,
  );
  res.json({ success: true, data: { submission } });
};

export const recordPayment: RequestHandler = async (req, res) => {
  const submission = await submissionService.recordPayment(
    req.user!,
    idOf(res.locals),
    req.body as RecordPaymentValues,
  );
  res.json({ success: true, data: { submission } });
};

export const changeStatus: RequestHandler = async (req, res) => {
  const submission = await submissionService.changeStatus(
    req.user!,
    idOf(res.locals),
    req.body as ChangeStatusValues,
  );
  res.json({ success: true, data: { submission } });
};
