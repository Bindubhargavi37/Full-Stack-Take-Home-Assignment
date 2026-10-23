import { DEFAULT_THEME, THEMES, type Theme } from 'shared';

const STORAGE_KEY = 'theme';

export function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved as Theme) ? (saved as Theme) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
}

export const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Turns our theme name into the daisyUI theme to apply. SYSTEM follows the OS setting. */
export function resolveTheme(theme: Theme): string {
  if (theme === 'SYSTEM') return systemPrefersDark() ? 'dark' : 'light';
  return theme.toLowerCase();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme));
}
