import { Navigate, Outlet } from 'react-router';
import type { Role } from 'shared';
import { useAuth } from '@/hooks/useAuth';

/**
 * Pages for some roles only (e.g. agent management for admins). Others see the 403 page.
 * This only hides pages; the API checks the role on every request as well.
 * Use inside ProtectedRoute, so the user is already loaded.
 */
export function RoleRoute({ allow }: { allow: readonly Role[] }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
