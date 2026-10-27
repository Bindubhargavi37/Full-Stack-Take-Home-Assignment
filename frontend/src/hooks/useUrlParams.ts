import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Filters kept in the page URL, so they survive a reload and can be shared.
 * `updateParams({ status: 'COMPLETED', page: '' })` sets a value, and an empty string removes it.
 */
export function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParams = useCallback(
    (changes: Record<string, string>) => {
      // Start from the latest URL (not this render's copy), so quick changes don't undo each other.
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  return { searchParams, setSearchParams, updateParams };
}
