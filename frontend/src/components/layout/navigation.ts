import { LayoutDashboard, UserRound, type LucideIcon } from 'lucide-react';
import type { Role } from 'shared';

export type NavItem = { label: string; to: string; icon: LucideIcon; roles: readonly Role[] };

// The sidebar shows only the items the user's role may open. The server enforces the same rules.
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'AGENT'] },
  { label: 'Profile', to: '/profile', icon: UserRound, roles: ['ADMIN', 'AGENT'] },
];
