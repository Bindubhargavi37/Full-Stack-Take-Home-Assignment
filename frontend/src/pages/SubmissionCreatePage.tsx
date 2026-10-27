import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { formatReference } from 'shared';
import { createSubmission } from '@/api/submissions.api';
import { SubmissionForm } from '@/features/submissions/SubmissionForm';
import { EMPTY_SUBMISSION_FORM } from '@/features/submissions/submissionFormDefaults';
import { queryKeys } from '@/lib/queryKeys';

export function SubmissionCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New submission</h1>
        <p className="text-base-content/70">
          Fields marked <span className="text-error">*</span> are required.
        </p>
      </div>
      <SubmissionForm
        defaultValues={EMPTY_SUBMISSION_FORM}
        submitLabel="Submit"
        cancelTo="/submissions"
        onSubmit={async (values) => {
          const submission = await createSubmission(values);
          await queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
          navigate(`/submissions/${submission.id}`, {
            state: { notice: `${formatReference(submission.referenceNo)} was submitted.` },
          });
        }}
      />
    </div>
  );
}
