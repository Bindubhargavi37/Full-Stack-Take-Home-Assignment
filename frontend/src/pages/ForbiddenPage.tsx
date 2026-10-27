import { ShieldX } from 'lucide-react';
import { Link } from 'react-router';

export function ForbiddenPage() {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <ShieldX className="text-error size-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">You don’t have access to this page</h1>
      <p className="text-base-content/70">
        Your role doesn’t allow it. Ask your admin if you need access.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Go to the dashboard
      </Link>
    </section>
  );
}
