import { Navigate, Outlet } from 'react-router';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import { useAuth } from '@/hooks/useAuth';

/** Pages for signed-out users only (the login page). Signed-in users go to the dashboard. */
export function GuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
