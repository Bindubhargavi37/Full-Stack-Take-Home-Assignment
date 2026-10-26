import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  CircleCheckBig,
  IndianRupee,
  Pencil,
  Undo2,
  XCircle,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import {
  formatReference,
  formatRupees,
  PAYABLE_STATUSES,
  RESUBMITTABLE_STATUSES,
  SAMPLE_CONDITION_LABELS,
  STATUS_TRANSITIONS,
  TEST_RESULT_LABELS,
  type StatusAction,
  type Submission,
} from 'shared';
import { getStatusHistory, getSubmission } from '@/api/submissions.api';
import { ChangeStatusDialog } from '@/features/submissions/ChangeStatusDialog';
import { latestSendBackNote } from '@/features/submissions/latestSendBackNote';
import { RecordPaymentDialog } from '@/features/submissions/RecordPaymentDialog';
import { RefundBadge } from '@/features/submissions/RefundBadge';
import { StatusBadge } from '@/features/submissions/StatusBadge';
import { StatusTimeline } from '@/features/submissions/StatusTimeline';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/apiClient';
import { formatCalendarDate, formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';

/** Don't retry "not found" or "bad id": the answer won't change. */
const retryUnlessMissing = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && [400, 404].includes(error.status)) && failureCount < 1;

const ADMIN_ACTIONS: readonly {
  action: StatusAction;
  label: string;
  icon: typeof Undo2;
  className: string;
}[] = [
  {
    action: 'complete',
    label: 'Mark as completed',
    icon: CircleCheckBig,
    className: 'btn-success',
  },
  { action: 'send-back', label: 'Send back', icon: Undo2, className: 'btn-warning' },
  { action: 'reject', label: 'Reject', icon: XCircle, className: 'btn-error btn-outline' },
];

function Details({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <section className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg">{title}</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([term, value]) => (
            <div key={term}>
              <dt className="text-base-content/60 text-sm">{term}</dt>
              <dd className="font-medium break-words">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function SubmissionDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);

  const submissionQuery = useQuery({
    queryKey: queryKeys.submission(id),
    queryFn: () => getSubmission(id),
    retry: retryUnlessMissing,
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.submissionHistory(id),
    queryFn: () => getStatusHistory(id),
    retry: retryUnlessMissing,
  });

  async function onUpdated(updated: Submission, message: string) {
    queryClient.setQueryData(queryKeys.submission(id), updated);
    setNotice(message);
    // Lists and the history change too.
    await queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
  }

  const backLink = (
    <Link to="/submissions" className="btn btn-ghost btn-sm -ml-2">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to submissions
    </Link>
  );

  if (submissionQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" aria-label="Loading submission" />
      </div>
    );
  }

  if (submissionQuery.isError) {
    const missing =
      submissionQuery.error instanceof ApiError &&
      [400, 404].includes(submissionQuery.error.status);
    return (
      <div className="space-y-4">
        {backLink}
        <div role="alert" className="alert alert-error alert-soft">
          {missing
            ? 'This submission does not exist, or you do not have access to it.'
            : submissionQuery.error.message}
        </div>
      </div>
    );
  }

  const submission = submissionQuery.data;
  const isAdmin = user?.role === 'ADMIN';
  const canPay = PAYABLE_STATUSES.includes(submission.status);
  const canResubmit = !isAdmin && RESUBMITTABLE_STATUSES.includes(submission.status);
  const adminActions = isAdmin
    ? ADMIN_ACTIONS.filter(({ action }) =>
        STATUS_TRANSITIONS[action].from.includes(submission.status),
      )
    : [];
  const sendBackNote = latestSendBackNote(historyQuery.data);
  const total = submission.totalAmount ?? 0;
  const isRejected = submission.status === 'REJECTED';

  return (
    <div className="space-y-4">
      {backLink}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{formatReference(submission.referenceNo)}</h1>
        <StatusBadge status={submission.status} />
      </div>
      <p className="text-base-content/70 -mt-2 text-sm">
        {isAdmin && <>By {submission.agent.fullName} · </>}
        Submitted {formatDateTime(submission.submittedAt ?? submission.createdAt)}
      </p>

      {notice && (
        <div role="status" className="alert alert-success alert-soft">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {notice}
        </div>
      )}

      {submission.status === 'NOT_FILLED_COMPLETELY' && (
        <div role="note" className="alert alert-warning alert-soft items-start">
          <div className="space-y-1">
            <p className="font-semibold">Sent back for changes</p>
            {sendBackNote && <p className="text-sm break-words">{sendBackNote}</p>}
            {!isAdmin && <p className="text-sm">Fix the form and resubmit it.</p>}
          </div>
        </div>
      )}
      {submission.status === 'REJECTED' && (
        <div role="note" className="alert alert-error alert-soft items-start">
          <div className="space-y-1">
            <p className="font-semibold">Rejected</p>
            <p className="text-sm break-words">{submission.rejectionReason}</p>
          </div>
        </div>
      )}
      {submission.status === 'COMPLETED' && (
        <div role="note" className="alert alert-success alert-soft">
          Completed on {formatDateTime(submission.completedAt)}.
        </div>
      )}

      {(canPay || canResubmit || adminActions.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {canPay && (
            <button type="button" className="btn btn-primary" onClick={() => setPaymentOpen(true)}>
              <IndianRupee className="size-4" aria-hidden="true" />
              Record payment
            </button>
          )}
          {canResubmit && (
            <Link to={`/submissions/${submission.id}/edit`} className="btn btn-primary">
              <Pencil className="size-4" aria-hidden="true" />
              Edit and resubmit
            </Link>
          )}
          {adminActions.map(({ action, label, icon: Icon, className }) => (
            <button
              key={action}
              type="button"
              className={`btn ${className}`}
              onClick={() => setStatusAction(action)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg">Billing</h2>
              <dl className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['Total', 'Total', submission.totalAmount],
                    ['Paid', 'Paid', submission.amountPaid],
                    // Nothing is due on a rejected submission: what was paid goes back.
                    isRejected
                      ? [
                          'Refund',
                          <RefundBadge key="refund" className="badge-sm" />,
                          submission.amountPaid,
                        ]
                      : ['Due', 'Due', submission.amountDue],
                  ] as [string, ReactNode, number | null][]
                ).map(([key, term, value]) => (
                  <div key={key}>
                    <dt className="text-base-content/60 flex h-5 items-center text-sm">{term}</dt>
                    <dd className="text-lg font-semibold">
                      {value === null ? '—' : formatRupees(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {total > 0 && !isRejected && (
                <progress
                  className="progress progress-success mt-2"
                  value={submission.amountPaid}
                  max={total}
                  aria-label={`${Math.round((submission.amountPaid / total) * 100)}% paid`}
                />
              )}
            </div>
          </section>

          <Details
            title="Customer"
            rows={[
              ['Name', submission.customerName],
              ['Location', submission.location],
              ['Phone', submission.customerPhone],
              ['Email', submission.customerEmail],
            ]}
          />

          <Details
            title="Sample"
            rows={[
              [
                'Condition',
                submission.sampleCondition && SAMPLE_CONDITION_LABELS[submission.sampleCondition],
              ],
              ['Test result', submission.result && TEST_RESULT_LABELS[submission.result]],
              ['Collected on', formatCalendarDate(submission.collectedOn)],
              ['Remarks', submission.remarks],
            ]}
          />
        </div>

        <section className="card bg-base-200 self-start">
          <div className="card-body">
            <h2 className="card-title text-lg">Status history</h2>
            {historyQuery.isPending ? (
              <span className="loading loading-spinner" aria-label="Loading history" />
            ) : historyQuery.isError ? (
              <p className="text-error text-sm">Could not load the history.</p>
            ) : (
              <StatusTimeline entries={historyQuery.data} />
            )}
          </div>
        </section>
      </div>

      {canPay && (
        <RecordPaymentDialog
          submission={submission}
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onRecorded={(updated, message) => void onUpdated(updated, message)}
        />
      )}
      {statusAction && (
        <ChangeStatusDialog
          // A fresh form for each action.
          key={statusAction}
          submission={submission}
          action={statusAction}
          open
          onClose={() => setStatusAction(null)}
          onChanged={(updated, message) => void onUpdated(updated, message)}
        />
      )}
    </div>
  );
}
