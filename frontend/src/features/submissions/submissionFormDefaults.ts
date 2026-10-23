import type { SubmissionFormInput } from 'shared';

/** A blank form. Number fields stay empty so the user must type the amounts. */
export const EMPTY_SUBMISSION_FORM = {
  customerName: '',
  location: '',
  customerPhone: '',
  customerEmail: '',
  amountPaid: 0,
  collectedOn: '',
  remarks: '',
} satisfies Partial<SubmissionFormInput>;
