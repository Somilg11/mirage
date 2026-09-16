import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Bottom sheet used for mobile flows (trade ticket, menus). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] animate-slide-up overflow-y-auto rounded-t-3xl border-t border-border bg-surface pb-safe shadow-pop">
        <div className="sticky top-0 z-10 bg-surface/95 px-4 pb-2 pt-2.5 backdrop-blur">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border-strong" />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 text-[15px] font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-surface-3 text-muted hover:text-fg"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
