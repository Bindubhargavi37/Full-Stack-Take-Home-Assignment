import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  changeStatusSchema,
  formatReference,
  STATUS_TRANSITIONS,
  type ChangeStatusInput,
  type ChangeStatusValues,
  type StatusAction,
  type Submission,
} from 'shared';
import { changeStatus } from '@/api/submissions.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { TextAreaField } from '@/components/form/TextAreaField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from './StatusBadge';

const COPY: Record<
  StatusAction,
  {
    title: string;
    explain: string;
    noteLabel: string;
    notePlaceholder: string;
    button: string;
    buttonClass: string;
    done: string;
  }
> = {
  complete: {
    title: 'Mark as completed',
    explain: 'The submission is fully paid. Completing it closes it for good.',
    noteLabel: 'Note (optional)',
    notePlaceholder: 'e.g. Payment verified with the bank statement',
    button: 'Mark as completed',
    buttonClass: 'btn-success',
    done: 'was marked as completed',
  },
  'send-back': {
    title: 'Send back for changes',
    explain: 'The agent will see your note, fix the form and resubmit it.',
    noteLabel: 'What needs to change?',
    notePlaceholder: 'e.g. Customer phone number is missing, please add it',
    button: 'Send back',
    buttonClass: 'btn-warning',
    done: 'was sent back to the agent',
  },
  reject: {
    title: 'Reject submission',
    explain: 'Rejecting is final. The agent will see the reason.',
    noteLabel: 'Reason for rejecting',
    notePlaceholder: 'e.g. Sample damaged beyond testing; customer informed',
    button: 'Reject',
    buttonClass: 'btn-error',
    done: 'was rejected',
  },
};

type Props = {
  submission: Submission;
  action: StatusAction;
  open: boolean;
  onClose: () => void;
  onChanged: (updated: Submission, message: string) => void;
};

/** Admin: complete, send back or reject. Sending back and rejecting need a note. */
export function ChangeStatusDialog({ submission, action, open, onClose, onChanged }: Props) {
  const copy = COPY[action];
  const noteRequired = action !== 'complete';
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeStatusInput, unknown, ChangeStatusValues>({
    resolver: zodResolver(changeStatusSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { action, note: '' },
  });

  function close() {
    reset();
    setFormError(null);
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await changeStatus(submission.id, values);
      close();
      onChanged(updated, `${formatReference(submission.referenceNo)} ${copy.done}.`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['note']));
    }
  });

  return (
    <Modal open={open} onClose={close} title={copy.title}>
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
            {formError}
          </div>
        )}
        <p className="text-base-content/80 text-sm">{copy.explain}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={submission.status} className="badge-sm" />
          <span aria-label="becomes">→</span>
          <StatusBadge status={STATUS_TRANSITIONS[action].to} className="badge-sm" />
        </p>
        <TextAreaField
          label={copy.noteLabel}
          placeholder={copy.notePlaceholder}
          required={noteRequired}
          maxLength={500}
          autoFocus
          hint={noteRequired ? '10–500 characters' : 'Up to 500 characters'}
          error={errors.note?.message}
          {...register('note')}
        />

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className={`btn ${copy.buttonClass}`} disabled={isSubmitting}>
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            {copy.button}
          </button>
        </div>
      </form>
    </Modal>
  );
}
