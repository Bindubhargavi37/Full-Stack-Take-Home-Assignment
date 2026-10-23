import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="bg-base-100 flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-primary text-6xl font-bold">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-base-content/70">The page you are looking for doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">
        Go to the dashboard
      </Link>
    </div>
  );
}
