import type { ChartTheme } from './useChartTheme';

// Shared chart chrome: quiet axes in text colour, hairline solid gridlines, thin bars.

/** Bars never get thicker than this; the rest of the band stays empty. */
export const MAX_BAR_SIZE = 24;
/** Rounded data-end, square at the baseline (vertical bars / horizontal bars). */
export const BAR_RADIUS_TOP: [number, number, number, number] = [4, 4, 0, 0];
export const BAR_RADIUS_END: [number, number, number, number] = [0, 4, 4, 0];

export function axisProps(theme: ChartTheme) {
  return {
    tick: { fill: theme.text, fillOpacity: 0.7, fontSize: 12 },
    axisLine: { stroke: theme.grid },
    tickLine: false,
  } as const;
}

export function gridProps(theme: ChartTheme) {
  return { stroke: theme.grid } as const;
}

/** A light wash behind the hovered bar group. */
export function cursorProps(theme: ChartTheme) {
  return { fill: theme.text, fillOpacity: 0.06 } as const;
}
