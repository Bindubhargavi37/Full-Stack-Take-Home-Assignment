import { STATUS_LABELS, STATUS_TONES, type SubmissionStatus } from 'shared';

// Full class names (not `badge-${tone}`), so Tailwind finds them when it scans the code.
const TONE_CLASSES: Record<(typeof STATUS_TONES)[SubmissionStatus], string> = {
  warning: 'badge-warning',
  info: 'badge-info',
  neutral: 'badge-neutral',
  success: 'badge-success',
  error: 'badge-error',
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  return (
    <span
      className={`badge h-auto py-0.5 whitespace-nowrap ${TONE_CLASSES[STATUS_TONES[status]]} ${className ?? ''}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
