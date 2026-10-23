import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  formatRupees,
  recordPaymentSchema,
  toPaise,
  type RecordPaymentInput,
  type RecordPaymentValues,
  type Submission,
} from 'shared';
import { recordPayment } from '@/api/submissions.api';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { TextField } from '@/components/form/TextField';
import { Modal } from '@/components/ui/Modal';

type Props = {
  submission: Submission;
  open: boolean;
  onClose: () => void;
  onRecorded: (updated: Submission, message: string) => void;
};

/** Records money received. Paying the whole amount due moves the submission to Payment Done. */
export function RecordPaymentDialog({ submission, open, onClose, onRecorded }: Props) {
  const due = submission.amountDue ?? 0;
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentInput, unknown, RecordPaymentValues>({
    // The API checks the same limit; checking here too gives instant feedback.
    resolver: zodResolver(
      recordPaymentSchema.refine((values) => toPaise(values.amount) <= toPaise(due), {
        message: `Payment cannot be more than the amount due (${formatRupees(due)})`,
        path: ['amount'],
      }),
    ),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function close() {
    reset();
    setFormError(null);
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await recordPayment(submission.id, values);
      close();
      onRecorded(
        updated,
        updated.status === 'BILLING_PAYMENT_DONE'
          ? `Payment of ${formatRupees(values.amount)} recorded. Fully paid.`
          : `Payment of ${formatRupees(values.amount)} recorded. ${formatRupees(updated.amountDue ?? 0)} still due.`,
      );
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['amount']));
    }
  });

  return (
    <Modal open={open} onClose={close} title="Record a payment">
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <div role="alert" className="alert alert-error alert-soft mb-2 text-sm">
            {formError}
          </div>
        )}
        <p className="text-sm">
          Amount due: <span className="font-semibold">{formatRupees(due)}</span>
        </p>
        <TextField
          label="Amount received (₹)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          autoFocus
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />
        <button
          type="button"
          className="btn btn-link btn-sm px-0"
          onClick={() => setValue('amount', due, { shouldValidate: true })}
        >
          Pay the full amount due
        </button>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            Record payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
