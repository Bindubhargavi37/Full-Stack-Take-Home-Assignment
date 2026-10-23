import {
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from 'shared';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: readonly Role[];
  /** Also highlight the item on these pages (by default only on exactly `to`). */
  activeOn?: (pathname: string) => boolean;
};

/** A submission's detail and edit pages belong to the submissions list, the "new" form doesn't. */
const isSubmissionPage = (pathname: string) =>
  pathname.startsWith('/submissions/') && pathname !== '/submissions/new';

// The sidebar shows only the items the user's role may open. The server enforces the same rules.
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'AGENT'] },
  { label: 'New submission', to: '/submissions/new', icon: FilePlus2, roles: ['AGENT'] },
  {
    label: 'My submissions',
    to: '/submissions',
    icon: ClipboardList,
    roles: ['AGENT'],
    activeOn: isSubmissionPage,
  },
  {
    label: 'Submissions',
    to: '/submissions',
    icon: ClipboardList,
    roles: ['ADMIN'],
    activeOn: isSubmissionPage,
  },
  { label: 'Manage agents', to: '/agents', icon: Users, roles: ['ADMIN'] },
  { label: 'Profile', to: '/profile', icon: UserRound, roles: ['ADMIN', 'AGENT'] },
];
