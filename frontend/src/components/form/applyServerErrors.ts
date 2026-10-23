import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/apiClient';

/**
 * Shows the server's field errors under the matching inputs.
 * Returns the message to show at the top of the form (or null if every error had a field).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';

  const unmatched = error.details.filter((detail) => {
    const field = fields.find((name) => name === detail.field);
    if (field) setError(field, { type: 'server', message: detail.message });
    return !field;
  });

  return error.details.length > 0 && unmatched.length === 0 ? null : error.message;
}
