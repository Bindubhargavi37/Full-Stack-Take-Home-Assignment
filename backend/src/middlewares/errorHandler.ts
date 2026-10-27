import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

// The one place that turns any thrown error into the standard JSON error response.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Malformed JSON body sent by the client.
  if (err instanceof SyntaxError && 'body' in err) {
    res
      .status(400)
      .json({ success: false, error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
    return;
  }

  logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'Something went wrong'
        : String(err instanceof Error ? err.message : err),
    },
  });
};
