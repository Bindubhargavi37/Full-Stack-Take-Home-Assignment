import { useSyncExternalStore } from 'react';
import { STATUS_TONES, SUBMISSION_STATUSES, type SubmissionStatus } from 'shared';

/**
 * Colours for the charts, read from the active daisyUI theme so charts match every theme.
 *
 * - Statuses use the same theme colours as the status badges (warning, info, neutral…).
 * - Other categories use a fixed, colour-blind-checked order (blue, orange, aqua), with
 *   separate steps for light and dark themes. Assigned in this order, never cycled.
 * - Single-series charts use the first slot only.
 */
export type ChartTheme = {
  dark: boolean;
  series: readonly [string, string, string];
  status: Record<SubmissionStatus, string>;
  /** The card background the charts sit on (for the gaps between marks). */
  surface: string;
  grid: string;
  text: string;
};

// Validated with the dataviz palette checker against light (#f2f2f2) and dark (#191e24) cards.
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a'] as const;
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70'] as const;

let cache: { key: string; theme: ChartTheme } | null = null;

function readTheme(): ChartTheme {
  const root = document.documentElement;
  const key = `${root.dataset.theme ?? ''}|${window.matchMedia('(prefers-color-scheme: dark)').matches}`;
  if (cache?.key === key) return cache.theme;

  const style = getComputedStyle(root);
  const css = (name: string) => style.getPropertyValue(name).trim();
  const dark = style.colorScheme === 'dark';
  const theme: ChartTheme = {
    dark,
    series: dark ? SERIES_DARK : SERIES_LIGHT,
    status: Object.fromEntries(
      SUBMISSION_STATUSES.map((status) => {
        const tone = STATUS_TONES[status];
        // daisyUI's "neutral" is near-black in dark themes, invisible on a dark card: use its
        // light companion colour there instead.
        const variable = tone === 'neutral' && dark ? '--color-neutral-content' : `--color-${tone}`;
        return [status, css(variable)];
      }),
    ) as Record<SubmissionStatus, string>,
    surface: css('--color-base-200'),
    grid: css('--color-base-300'),
    text: css('--color-base-content'),
  };
  cache = { key, theme };
  return theme;
}

function subscribe(onChange: () => void) {
  // The theme picker changes data-theme on <html>; "System" also follows the OS setting.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onChange);
  };
}

/** The current chart colours; charts re-render when the theme changes. */
export function useChartTheme(): ChartTheme {
  return useSyncExternalStore(subscribe, readTheme);
}
