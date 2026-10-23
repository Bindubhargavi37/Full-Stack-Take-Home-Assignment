import { LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ROLE_LABELS } from 'shared';
import { useAuth } from '@/hooks/useAuth';

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;

  async function handleLogout() {
    setSigningOut(true);
    await logout().catch(() => undefined);
    navigate('/login', { replace: true });
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-sm gap-2 px-2"
        aria-label="Open user menu"
      >
        <span
          className="bg-primary text-primary-content flex size-8 items-center justify-center rounded-full text-xs font-semibold"
          aria-hidden="true"
        >
          {initials(user.fullName)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-medium">{user.fullName}</span>
          <span className="block text-xs opacity-60">{ROLE_LABELS[user.role]}</span>
        </span>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 rounded-box z-50 mt-2 w-56 p-2 shadow-lg"
      >
        <li className="menu-title">
          <span className="truncate">{user.email}</span>
        </li>
        <li>
          <Link to="/profile">
            <UserRound className="size-4" aria-hidden="true" /> Profile
          </Link>
        </li>
        <li>
          <button type="button" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="size-4" aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </li>
      </ul>
    </div>
  );
}
