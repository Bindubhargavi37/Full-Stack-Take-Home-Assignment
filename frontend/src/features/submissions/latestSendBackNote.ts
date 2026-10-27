import type { StatusHistoryEntry } from 'shared';

/** The admin's note from the most recent "send back", if any. */
export function latestSendBackNote(history: readonly StatusHistoryEntry[] | undefined) {
  return [...(history ?? [])].reverse().find((entry) => entry.toStatus === 'NOT_FILLED_COMPLETELY')
    ?.note;
}
