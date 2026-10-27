import { useId, type Ref, type TextareaHTMLAttributes } from 'react';

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLTextAreaElement>;
};

/** A labelled multi-line input with its error message linked for screen readers. */
export function TextAreaField({
  label,
  error,
  hint,
  required,
  className,
  ref,
  ...textareaProps
}: TextAreaFieldProps) {
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
      <textarea
        id={id}
        ref={ref}
        required={required}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`textarea w-full ${error ? 'textarea-error' : ''} ${className ?? ''}`}
        {...textareaProps}
      />
      {message && (
        <p
          id={messageId}
          className={`label text-sm whitespace-normal ${error ? 'text-error' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </fieldset>
  );
}
