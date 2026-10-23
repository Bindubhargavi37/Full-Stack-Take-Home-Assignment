import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatReference, RESUBMITTABLE_STATUSES } from 'shared';
import { getStatusHistory, getSubmission, resubmitSubmission } from '@/api/submissions.api';
import { latestSendBackNote } from '@/features/submissions/latestSendBackNote';
import { SubmissionForm } from '@/features/submissions/SubmissionForm';
import { queryKeys } from '@/lib/queryKeys';

/** Agent: fix a submission the admin sent back, then resubmit it. */
export function SubmissionEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submissionQuery = useQuery({
    queryKey: queryKeys.submission(id),
    queryFn: () => getSubmission(id),
    retry: false,
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.submissionHistory(id),
    queryFn: () => getStatusHistory(id),
    retry: false,
  });

  const back = (
    <Link to={`/submissions/${id}`} className="btn btn-ghost btn-sm -ml-2">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to the submission
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
    return (
      <div className="space-y-4">
        {back}
        <div role="alert" className="alert alert-error alert-soft">
          This submission does not exist, or you do not have access to it.
        </div>
      </div>
    );
  }

  const submission = submissionQuery.data;
  const reference = formatReference(submission.referenceNo);
  if (!RESUBMITTABLE_STATUSES.includes(submission.status)) {
    return (
      <div className="space-y-4">
        {back}
        <div role="alert" className="alert alert-info alert-soft">
          {reference} can be edited only after the admin sends it back for changes.
        </div>
      </div>
    );
  }

  const sendBackNote = latestSendBackNote(historyQuery.data);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {back}
      <div>
        <h1 className="text-2xl font-bold">Edit and resubmit {reference}</h1>
        <p className="text-base-content/70">
          Fields marked <span className="text-error">*</span> are required.
        </p>
      </div>
      {sendBackNote && (
        <div role="note" className="alert alert-warning alert-soft items-start">
          <div>
            <p className="font-semibold">The admin asked for these changes</p>
            <p className="text-sm break-words">{sendBackNote}</p>
          </div>
        </div>
      )}
      <SubmissionForm
        defaultValues={{
          customerName: submission.customerName ?? '',
          location: submission.location ?? '',
          customerPhone: submission.customerPhone ?? '',
          customerEmail: submission.customerEmail ?? '',
          totalAmount: submission.totalAmount ?? undefined,
          amountPaid: submission.amountPaid,
          sampleCondition: submission.sampleCondition ?? undefined,
          result: submission.result ?? undefined,
          collectedOn: submission.collectedOn ?? '',
          remarks: submission.remarks ?? '',
        }}
        submitLabel="Resubmit"
        cancelTo={`/submissions/${id}`}
        onSubmit={async (values) => {
          const updated = await resubmitSubmission(id, values);
          queryClient.setQueryData(queryKeys.submission(id), updated);
          await queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
          navigate(`/submissions/${id}`, { state: { notice: `${reference} was resubmitted.` } });
        }}
      />
    </div>
  );
}
