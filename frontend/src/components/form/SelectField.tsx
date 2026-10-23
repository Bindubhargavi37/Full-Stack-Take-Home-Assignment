import { useId, type Ref, type SelectHTMLAttributes } from 'react';

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly { value: string; label: string }[];
  /** First, empty option (e.g. "Choose…"). */
  placeholder?: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLSelectElement>;
};

/** A labelled dropdown with its error message linked for screen readers (like TextField). */
export function SelectField({
  label,
  options,
  placeholder,
  error,
  hint,
  required,
  className,
  ref,
  ...selectProps
}: SelectFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <fieldset className="fieldset">
      <label htmlFor={id} className="fieldset-legend pb-1">
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <select
        id={id}
        ref={ref}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`select w-full ${error ? 'select-error' : ''} ${className ?? ''}`}
        {...selectProps}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {message && (
        <p
          id={messageId}
          className={`label text-sm ${error ? 'text-error' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </fieldset>
  );
}
