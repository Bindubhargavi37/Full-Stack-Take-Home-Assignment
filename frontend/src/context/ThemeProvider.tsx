import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Theme } from 'shared';
import { saveThemePreference } from '@/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { applyTheme, readStoredTheme, storeTheme } from '@/lib/theme';
import { ThemeContext } from './themeContext';

/**
 * Holds the chosen daisyUI theme. It is saved in the browser right away (works before login)
 * and on the user's account when signed in, so it follows them to other devices.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [localTheme, setLocalTheme] = useState<Theme>(readStoredTheme);
  // After login, the theme saved on the account wins over the browser's.
  const theme = user?.themePreference ?? localTheme;

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
    if (theme !== 'SYSTEM') return;
    // Follow the operating system when it switches between light and dark.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('SYSTEM');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setLocalTheme(next);
      if (!user) return;
      setUser({ ...user, themePreference: next });
      // Saving to the account is best effort; the theme already applies locally.
      saveThemePreference(next).catch(() => undefined);
    },
    [user, setUser],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
