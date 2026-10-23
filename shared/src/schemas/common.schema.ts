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

/** Optional text: missing, empty or blank becomes null; anything else must pass `rule`. */
export function optionalText<T extends z.ZodType<unknown, string>>(rule: T) {
  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .pipe(rule.nullable())
    .nullish()
    .transform((value) => value ?? null);
}

/** Optional phone number: 10–15 digits, optionally starting with +. */
export const optionalPhoneSchema = optionalText(
  z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter 10–15 digits, optionally starting with +'),
);

/** A person's name: 2–100 characters, letters (any language), spaces and . ' - only. */
export function personNameSchema(label: string) {
  return z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(2, `${label} must be at least 2 characters`)
    .max(100, `${label} must be at most 100 characters`)
    .regex(/^[\p{L} .'-]+$/u, "Use letters, spaces and . ' - only");
}
