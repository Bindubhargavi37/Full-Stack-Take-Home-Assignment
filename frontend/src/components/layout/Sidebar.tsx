import { ClipboardList } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS } from './navigation';

export const DRAWER_ID = 'app-drawer';

/** Closes the mobile drawer after a link is chosen. */
function closeDrawer() {
  const toggle = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
  if (toggle) toggle.checked = false;
}

export function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const items = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="bg-base-200 flex min-h-full w-64 flex-col border-r border-base-300">
      <div className="flex h-16 items-center gap-2 px-5">
        <ClipboardList className="text-primary size-6" aria-hidden="true" />
        <span className="text-lg font-semibold">Forms Dashboard</span>
      </div>
      <nav aria-label="Main">
        <ul className="menu w-full gap-1 px-3">
          {items.map(({ label, to, icon: Icon, activeOn }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                onClick={closeDrawer}
                className={({ isActive }) =>
                  isActive || activeOn?.(pathname) ? 'menu-active' : ''
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
