import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** Extra content inside the input box, e.g. a show/hide button. */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

/** A labelled input with its error message linked for screen readers. */
export function TextField({
  label,
  error,
  hint,
  trailing,
  required,
  className,
  ref,
  ...inputProps
}: TextFieldProps) {
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
      {/* A div, not a label: the input already has exactly one label (above). */}
      <div className={`input w-full ${error ? 'input-error' : ''} ${className ?? ''}`}>
        <input
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="grow"
          {...inputProps}
        />
        {trailing}
      </div>
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
