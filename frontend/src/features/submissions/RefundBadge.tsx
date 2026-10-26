import { RotateCcw } from 'lucide-react';

/** Marks money paid on a rejected submission, which goes back to the customer. */
export function RefundBadge({ className }: { className?: string }) {
  return (
    <span
      className={`badge badge-warning badge-soft h-auto gap-1 py-0.5 whitespace-nowrap ${className ?? ''}`}
    >
      <RotateCcw className="size-3" aria-hidden="true" />
      Refund
    </span>
  );
}
