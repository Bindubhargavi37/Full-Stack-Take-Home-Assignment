import { PagePlaceholder } from '@/components/feedback/PagePlaceholder';

// Placeholder: the form is built in feature/submissions.
export function SubmissionCreatePage() {
  return (
    <PagePlaceholder
      title="New submission"
      description="Fill in a customer's sample details and submit them for billing."
      plannedItems={[
        'Customer name, location, phone and email',
        'Total amount, amount paid and the amount due calculated live',
        'Sample condition, test result, collected-on date and remarks',
        'Validation on every field before the form can be submitted',
      ]}
    />
  );
}
