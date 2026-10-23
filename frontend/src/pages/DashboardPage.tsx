import { ROLE_LABELS } from 'shared';
import { useAuth } from '@/hooks/useAuth';

// Placeholder until the dashboard feature adds the cards and charts.
export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  const firstName = user.fullName.split(' ')[0];

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
      <p className="text-base-content/70">
        You are signed in as{' '}
        <span className="badge badge-primary badge-soft">{ROLE_LABELS[user.role]}</span>
        {user.role === 'ADMIN'
          ? ' — you will see every agent’s metrics here.'
          : ' — you will see your own submissions and metrics here.'}
      </p>
    </section>
  );
}
