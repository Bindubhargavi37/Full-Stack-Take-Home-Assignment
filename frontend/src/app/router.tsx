import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { AgentListPage } from '@/pages/AgentListPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SubmissionCreatePage } from '@/pages/SubmissionCreatePage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { SubmissionEditPage } from '@/pages/SubmissionEditPage';
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
          {
            path: '/dashboard',
            // Loaded on first visit, so the chart library isn't part of the main bundle.
            lazy: async () => ({
              Component: (await import('@/pages/DashboardPage')).DashboardPage,
            }),
          },
          { path: '/submissions', element: <SubmissionListPage /> },
          { path: '/submissions/:id', element: <SubmissionDetailPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/403', element: <ForbiddenPage /> },
          {
            element: <RoleRoute allow={['AGENT']} />,
            children: [
              { path: '/submissions/new', element: <SubmissionCreatePage /> },
              { path: '/submissions/:id/edit', element: <SubmissionEditPage /> },
            ],
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
