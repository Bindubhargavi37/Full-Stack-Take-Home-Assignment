import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { AgentListPage } from '@/pages/AgentListPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SubmissionCreatePage } from '@/pages/SubmissionCreatePage';
import { SubmissionListPage } from '@/pages/SubmissionListPage';
import { GuestRoute } from '@/routes/GuestRoute';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleRoute } from '@/routes/RoleRoute';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/submissions', element: <SubmissionListPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/403', element: <ForbiddenPage /> },
          {
            element: <RoleRoute allow={['AGENT']} />,
            children: [{ path: '/submissions/new', element: <SubmissionCreatePage /> }],
          },
          {
            element: <RoleRoute allow={['ADMIN']} />,
            children: [{ path: '/agents', element: <AgentListPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
