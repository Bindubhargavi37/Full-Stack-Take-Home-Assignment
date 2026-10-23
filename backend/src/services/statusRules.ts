import type { SubmissionStatus } from 'shared';
import { AppError } from '../utils/AppError';

// The allowed moves are defined once in shared (STATUS_TRANSITIONS, RESUBMITTABLE_STATUSES,
// PAYABLE_STATUSES), so the UI offers exactly the actions this server accepts.

/** Throws 409 when `current` is not one of the allowed starting statuses. */
export function assertStatusIn(
  current: SubmissionStatus,
  allowed: readonly SubmissionStatus[],
  message: string,
) {
  if (!allowed.includes(current)) {
    throw new AppError(409, 'INVALID_TRANSITION', message, { currentStatus: current });
  }
}
