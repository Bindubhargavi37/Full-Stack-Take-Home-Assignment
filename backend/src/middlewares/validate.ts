import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/**
 * Validates the request with the shared Zod schemas before the controller runs.
 * The parsed (trimmed, lowercased, coerced) values replace the raw input.
 * A ZodError is passed to the error handler, which returns 400 with field errors.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    // Express 5 makes req.query read-only, so parsed query/params go to res.locals.
    if (schemas.query) res.locals.query = schemas.query.parse(req.query);
    if (schemas.params) res.locals.params = schemas.params.parse(req.params);
    next();
  };
}
