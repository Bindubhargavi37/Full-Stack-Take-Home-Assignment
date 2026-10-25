import { CSRF_HEADER, CSRF_HEADER_VALUE } from 'shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export type FieldError = { field: string; message: string };

/** An error response from the API, in the standard { success: false, error } shape. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown };

// These auth calls must never trigger a token refresh themselves.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Called when the session can't be renewed, so the app can send the user to the login page. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

function send(path: string, { method = 'GET', body }: RequestOptions) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      [CSRF_HEADER]: CSRF_HEADER_VALUE,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** One refresh at a time: parallel requests that all got 401 wait for the same refresh. */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string; details?: FieldError[] };
  } | null;
  return new ApiError(
    res.status,
    body?.error?.code ?? 'UNKNOWN_ERROR',
    body?.error?.message ?? 'Something went wrong. Please try again.',
    Array.isArray(body?.error?.details) ? body.error.details : [],
  );
}

/** Filters as they appear in a page URL; empty values are left out of the request. */
export type QueryParams = Record<string, string | undefined>;

/** "/submissions" + { status: 'COMPLETED', search: '' } → "/submissions?status=COMPLETED". */
export function withQuery(path: string, params: QueryParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

/** Calls the API and returns `data` from the response, or throws an ApiError. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, options);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }

  // The 15-minute access token expired: renew it once with the refresh token, then retry.
  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshSession()) {
      res = await send(path, options);
    } else {
      onSessionExpired?.();
    }
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as { data: T };
  return body.data;
}
