import { Check, X } from 'lucide-react';

// Mirrors passwordSchema in shared/src/schemas/auth.schema.ts, shown live while typing.
const RULES = [
  { label: '8 to 72 characters', test: (value: string) => value.length >= 8 && value.length <= 72 },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
  { label: 'A special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2" aria-label="Password requirements">
      {RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 ${met ? 'text-success' : 'text-base-content/60'}`}
          >
            {met ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <X className="size-4" aria-hidden="true" />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
