import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import {
  billingStatusFor,
  formatRupees,
  SAMPLE_CONDITION_LABELS,
  SAMPLE_CONDITIONS,
  submissionFormSchema,
  TEST_RESULT_LABELS,
  TEST_RESULTS,
  toPaise,
  type SubmissionFormInput,
  type SubmissionFormValues,
} from 'shared';
import { applyServerErrors } from '@/components/form/applyServerErrors';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { Modal } from '@/components/ui/Modal';
import { todayString } from '@/lib/format';
import { StatusBadge } from './StatusBadge';

const FIELDS = [
  'customerName',
  'location',
  'customerPhone',
  'customerEmail',
  'totalAmount',
  'amountPaid',
  'sampleCondition',
  'result',
  'collectedOn',
  'remarks',
] as const satisfies readonly (keyof SubmissionFormInput)[];

const conditionOptions = SAMPLE_CONDITIONS.map((value) => ({
  value,
  label: SAMPLE_CONDITION_LABELS[value],
}));
const resultOptions = TEST_RESULTS.map((value) => ({ value, label: TEST_RESULT_LABELS[value] }));

const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

type Props = {
  defaultValues: Partial<SubmissionFormInput>;
  submitLabel: string;
  cancelTo: string;
  /** Saves the form. Throw (an ApiError) to show the server's errors on the form. */
  onSubmit: (values: SubmissionFormValues) => Promise<void>;
};

/**
 * The submission form, for a new submission and for resubmitting one the admin sent back.
 * It validates with the same Zod schema as the API, shows the amount due live, and asks for
 * confirmation (showing the status the submission will get) before saving.
 */
export function SubmissionForm({ defaultValues, submitLabel, cancelTo, onSubmit }: Props) {
  const [pending, setPending] = useState<SubmissionFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SubmissionFormInput, unknown, SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    // Check on submit, then live while fixing (same as the other forms).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues,
  });

  const [total, paid] = useWatch({ control, name: ['totalAmount', 'amountPaid'] });
  const amountDue = isAmount(total)
    ? (toPaise(total) - toPaise(isAmount(paid) ? paid : 0)) / 100
    : null;

  // Valid form → open the confirmation; the request is sent only after "Confirm".
  const review = handleSubmit((values) => {
    setFormError(null);
    setPending(values);
  });

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    try {
      await onSubmit(pending);
    } catch (error) {
      setPending(null);
      setFormError(applyServerErrors(error, setError, FIELDS));
    } finally {
      setSaving(false);
    }
  }

  const amountOptions = { valueAsNumber: true } as const;

  return (
    <>
      <form onSubmit={review} noValidate className="space-y-6">
        <section className="card bg-base-200" aria-labelledby="customer-heading">
          <div className="card-body gap-0">
            <h2 id="customer-heading" className="card-title text-lg">
              Customer
            </h2>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <TextField
                label="Customer name"
                placeholder="e.g. Kavya Rao"
                autoComplete="off"
                required
                error={errors.customerName?.message}
                {...register('customerName')}
              />
              <TextField
                label="Location"
                placeholder="City, area or landmark"
                required
                error={errors.location?.message}
                {...register('location')}
              />
              <TextField
                label="Customer phone"
                type="tel"
                inputMode="tel"
                placeholder="10–15 digits"
                error={errors.customerPhone?.message}
                {...register('customerPhone')}
              />
              <TextField
                label="Customer email"
                type="email"
                placeholder="name@example.com"
                error={errors.customerEmail?.message}
                {...register('customerEmail')}
              />
            </div>
          </div>
        </section>

        <section className="card bg-base-200" aria-labelledby="billing-heading">
          <div className="card-body gap-0">
            <h2 id="billing-heading" className="card-title text-lg">
              Billing
            </h2>
            <div className="grid gap-x-4 sm:grid-cols-3">
              <TextField
                label="Total amount (₹)"
                placeholder="e.g. 1500.00"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                error={errors.totalAmount?.message}
                {...register('totalAmount', amountOptions)}
              />
              <TextField
                label="Amount paid (₹)"
                placeholder="0.00"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                error={errors.amountPaid?.message}
                {...register('amountPaid', amountOptions)}
              />
              <TextField
                label="Amount due (₹)"
                readOnly
                value={amountDue === null ? '' : formatRupees(amountDue)}
                placeholder="Calculated"
                className="bg-base-300/40"
                error={
                  amountDue !== null && amountDue < 0
                    ? 'Amount paid is more than the total'
                    : undefined
                }
                hint="Total − paid, calculated for you"
              />
            </div>
            {amountDue !== null && amountDue >= 0 && isAmount(total) && total > 0 && (
              <p className="text-base-content/70 mt-2 flex flex-wrap items-center gap-2 text-sm">
                Status after submitting:
                <StatusBadge status={billingStatusFor(total, total - amountDue)} />
              </p>
            )}
          </div>
        </section>

        <section className="card bg-base-200" aria-labelledby="sample-heading">
          <div className="card-body gap-0">
            <h2 id="sample-heading" className="card-title text-lg">
              Sample
            </h2>
            <div className="grid gap-x-4 sm:grid-cols-3">
              <SelectField
                label="Sample condition"
                placeholder="Choose…"
                options={conditionOptions}
                required
                error={errors.sampleCondition?.message}
                {...register('sampleCondition')}
              />
              <SelectField
                label="Test result"
                placeholder="Choose…"
                options={resultOptions}
                required
                error={errors.result?.message}
                {...register('result')}
              />
              <TextField
                label="Collected on"
                type="date"
                max={todayString()}
                error={errors.collectedOn?.message}
                {...register('collectedOn')}
              />
            </div>
            <TextAreaField
              label="Remarks"
              placeholder="Anything the admin should know about this sample (optional)"
              maxLength={500}
              hint="Optional, up to 500 characters"
              error={errors.remarks?.message}
              {...register('remarks')}
            />
          </div>
        </section>

        {formError && (
          <div role="alert" className="alert alert-error alert-soft text-sm">
            {formError}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to={cancelTo} className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary">
            <Send className="size-4" aria-hidden="true" />
            {submitLabel}
          </button>
        </div>
      </form>

      <Modal open={pending !== null} onClose={() => setPending(null)} title="Submit this form?">
        {pending && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-base-content/60">Customer</dt>
              <dd className="font-medium break-words">{pending.customerName}</dd>
              <dt className="text-base-content/60">Location</dt>
              <dd className="font-medium break-words">{pending.location}</dd>
              <dt className="text-base-content/60">Total amount</dt>
              <dd className="font-medium">{formatRupees(pending.totalAmount)}</dd>
              <dt className="text-base-content/60">Amount paid</dt>
              <dd className="font-medium">{formatRupees(pending.amountPaid)}</dd>
              <dt className="text-base-content/60">Amount due</dt>
              <dd className="font-medium">
                {formatRupees((toPaise(pending.totalAmount) - toPaise(pending.amountPaid)) / 100)}
              </dd>
              <dt className="text-base-content/60">Status</dt>
              <dd>
                <StatusBadge status={billingStatusFor(pending.totalAmount, pending.amountPaid)} />
              </dd>
            </dl>
            <p className="text-base-content/70 mt-3 text-sm">
              After submitting you can still record payments, but you can edit the details only if
              the admin sends the form back.
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                Go back
              </button>
              <button type="button" className="btn btn-primary" onClick={confirm} disabled={saving}>
                {saving && (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                )}
                Confirm and submit
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
