import { PagePlaceholder } from '@/components/feedback/PagePlaceholder';

// Placeholder: agent management is built in feature/submissions.
export function AgentListPage() {
  return (
    <PagePlaceholder
      title="Manage agents"
      description="Create and manage the agents who report to you."
      plannedItems={[
        'List of agents with their submission counts and last sign-in',
        'Add a new agent and edit their details',
        'Deactivate or reactivate an agent, and reset their password',
      ]}
    />
  );
}
