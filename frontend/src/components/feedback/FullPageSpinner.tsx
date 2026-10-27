export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="bg-base-100 flex min-h-screen items-center justify-center" role="status">
      <span className="loading loading-spinner loading-lg text-primary" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
