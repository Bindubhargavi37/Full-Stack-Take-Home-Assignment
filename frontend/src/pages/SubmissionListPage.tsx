import { PagePlaceholder } from '@/components/feedback/PagePlaceholder';
import { useAuth } from '@/hooks/useAuth';

// Placeholder: the list is built in feature/submissions. Agents see their own submissions,
// admins see every agent's.
export function SubmissionListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return isAdmin ? (
    <PagePlaceholder
      title="Submissions"
      description="Every submission from all of your agents, with tools to review them."
      plannedItems={[
        'Search, filter by status, date range and agent, and pagination',
        'Detail page with the full status history',
        'Mark as completed, send back for missing information, or reject with a reason',
      ]}
    />
  ) : (
    <PagePlaceholder
      title="My submissions"
      description="All the forms you have submitted and where each one stands."
      plannedItems={[
        'Search, filter by status and date range, and pagination',
        'Detail page with the full status history',
        'Record a payment, and fix and resubmit forms the admin sent back',
      ]}
    />
  );
}
