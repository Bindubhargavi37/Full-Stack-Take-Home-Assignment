import { Check, Palette } from 'lucide-react';
import { THEME_LABELS, THEMES } from 'shared';
import { useTheme } from '@/hooks/useTheme';

/** Dropdown listing every daisyUI theme, each with a small preview of its colours. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-sm gap-2"
        aria-label="Change theme"
      >
        <Palette className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 rounded-box z-50 mt-2 w-52 p-2 shadow-lg"
      >
        {THEMES.map((option) => (
          <li key={option}>
            <button
              type="button"
              onClick={() => setTheme(option)}
              className={`flex items-center justify-between ${option === theme ? 'menu-active' : ''}`}
              aria-current={option === theme ? 'true' : undefined}
            >
              <span className="flex items-center gap-2">
                {option === 'SYSTEM' ? (
                  <span className="bg-base-content/20 size-4 rounded-full" aria-hidden="true" />
                ) : (
                  <span
                    data-theme={option.toLowerCase()}
                    className="bg-base-100 flex size-4 overflow-hidden rounded-full border border-base-content/20"
                    aria-hidden="true"
                  >
                    <span className="bg-primary w-1/2" />
                    <span className="bg-secondary w-1/2" />
                  </span>
                )}
                {THEME_LABELS[option]}
              </span>
              {option === theme && <Check className="size-4" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
