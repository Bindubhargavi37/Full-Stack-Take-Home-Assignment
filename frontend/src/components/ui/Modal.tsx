import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Wider box, for content such as an enlarged chart. */
  wide?: boolean;
  children: ReactNode;
};

/**
 * Accessible dialog built on the native <dialog> element (daisyUI "modal" styles).
 * The browser handles focus trapping and the Esc key; clicking the backdrop also closes it.
 */
export function Modal({ open, onClose, title, wide = false, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onClose={onClose}>
      <div className={`modal-box ${wide ? 'w-11/12 max-w-5xl' : ''}`}>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" tabIndex={-1}>
          Close
        </button>
      </form>
    </dialog>
  );
}
