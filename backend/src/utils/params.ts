import type { Response } from 'express';

/** The `:id` route parameter, already checked by validate({ params: idParamsSchema }). */
export function idParam(res: Response): string {
  return (res.locals.params as { id: string }).id;
}
