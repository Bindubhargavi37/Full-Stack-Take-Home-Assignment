import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import { useAuth } from '@/hooks/useAuth';

/**
 * Only signed-in users get past this point; everyone else goes to /login and comes back
 * to the page they wanted afterwards. (The API checks every request on its own as well.)
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
