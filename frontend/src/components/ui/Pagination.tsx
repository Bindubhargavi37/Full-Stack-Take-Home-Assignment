import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  /** What is being counted, singular, e.g. "submission" → "34 submissions". */
  noun: string;
  onPageChange: (page: number) => void;
};

/** "34 submissions   ◀ Page 2 of 4 ▶" under a paginated list. */
export function Pagination({ page, totalPages, total, noun, onPageChange }: Props) {
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 text-sm"
      aria-label="Pagination"
    >
      <span className="text-base-content/70">
        {total} {noun}
        {total === 1 ? '' : 's'}
      </span>
      <div className="join">
        <button
          type="button"
          className="btn btn-sm join-item"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="btn btn-sm join-item pointer-events-none">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          className="btn btn-sm join-item"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
