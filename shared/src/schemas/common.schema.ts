import { z } from 'zod';

export const uuidSchema = z.uuid({ message: 'Invalid id' });

export const emailSchema = z
  .string({ message: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email must be at most 254 characters')
  .pipe(z.email({ message: 'Enter a valid email address' }))
  .transform((value) => value.toLowerCase());

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Route parameter `:id`. */
export const idParamsSchema = z.object({ id: uuidSchema });

/** A calendar date sent as YYYY-MM-DD. */
export const dateStringSchema = z.iso.date({ message: 'Enter a valid date (YYYY-MM-DD)' });
