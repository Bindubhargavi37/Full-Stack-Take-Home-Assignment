// daisyUI theme names offered in the theme picker. SYSTEM follows the OS light/dark setting.

export const THEMES = [
  'SYSTEM',
  'LIGHT',
  'DARK',
  'CORPORATE',
  'EMERALD',
  'CUPCAKE',
  'DRACULA',
] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  SYSTEM: 'System',
  LIGHT: 'Pastel beige',
  DARK: 'Dark',
  CORPORATE: 'Corporate',
  EMERALD: 'Emerald',
  CUPCAKE: 'Cupcake',
  DRACULA: 'Dracula',
};

export const DEFAULT_THEME: Theme = 'SYSTEM';
