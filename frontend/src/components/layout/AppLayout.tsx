import { Menu } from 'lucide-react';
import { Outlet } from 'react-router';
import { DRAWER_ID, Sidebar } from './Sidebar';
import { ThemePicker } from './ThemePicker';
import { UserMenu } from './UserMenu';

/** Shell for every signed-in page: sidebar (a drawer on small screens), top bar, content. */
export function AppLayout() {
  return (
    <div className="drawer lg:drawer-open">
      <input
        id={DRAWER_ID}
        type="checkbox"
        className="drawer-toggle"
        aria-label="Toggle navigation"
      />

      <div className="drawer-content flex min-h-screen flex-col">
        <a
          href="#main"
          className="btn btn-sm btn-primary sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
        >
          Skip to content
        </a>
        <header className="navbar bg-base-100 sticky top-0 z-30 gap-2 border-b border-base-300 px-4">
          <label
            htmlFor={DRAWER_ID}
            className="btn btn-ghost btn-square btn-sm lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </label>
          <div className="flex-1" />
          <ThemePicker />
          <UserMenu />
        </header>
        <main id="main" className="bg-base-100 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <div className="drawer-side z-40">
        <label htmlFor={DRAWER_ID} className="drawer-overlay" aria-label="Close navigation" />
        <Sidebar />
      </div>
    </div>
  );
}
