import { useEffect, useState } from 'react';
import { THEME_LABELS, THEMES, type Theme } from 'shared';

type ApiStatus = 'checking' | 'up' | 'down';

// Temporary landing page that proves the toolchain works end to end:
// React + Vite, Tailwind + daisyUI themes, the shared package, and the API through the Vite proxy.
// It is replaced by the login page and router in feature/auth.
export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [databaseUp, setDatabaseUp] = useState(false);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'SYSTEM',
  );

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((body: { data: { database: 'up' | 'down' } }) => {
        setApiStatus('up');
        setDatabaseUp(body.data.database === 'up');
      })
      .catch(() => setApiStatus('down'));
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'SYSTEM' ? (prefersDark ? 'dark' : 'light') : theme.toLowerCase();
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme]);

  return (
    <main className="bg-base-200 flex min-h-screen items-center justify-center p-4">
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body gap-4">
          <h1 className="card-title text-2xl">Forms Dashboard</h1>
          <p className="text-base-content/70">Project setup is working.</p>

          <ul className="space-y-2">
            <li className="flex items-center justify-between">
              <span>API</span>
              <StatusBadge status={apiStatus} />
            </li>
            <li className="flex items-center justify-between">
              <span>Database</span>
              <StatusBadge
                status={apiStatus === 'checking' ? 'checking' : databaseUp ? 'up' : 'down'}
              />
            </li>
          </ul>

          <label className="form-control w-full">
            <span className="label-text mb-1">Theme</span>
            <select
              className="select select-bordered w-full"
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {THEME_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <span className="badge badge-success">Completed</span>
            <span className="badge badge-warning">Payment Pending</span>
            <span className="badge badge-error">Rejected</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: ApiStatus }) {
  if (status === 'checking') return <span className="loading loading-dots loading-sm" />;
  return status === 'up' ? (
    <span className="badge badge-success">Connected</span>
  ) : (
    <span className="badge badge-error">Not reachable</span>
  );
}
