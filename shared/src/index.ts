export * from './constants/roles';
export * from './constants/submission';
export * from './constants/themes';
export * from './schemas/common.schema';
export * from './schemas/auth.schema';
export * from './schemas/submission.schema';

/** Every request that changes data must send this header (a simple CSRF guard). */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'XMLHttpRequest';
