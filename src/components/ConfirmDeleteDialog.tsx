import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  open: boolean;
  /** The name the admin must retype before the action arms. */
  itemName: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  /** Blocks a second confirm while the first is still in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Deliberately forgiving about padding and case.
 *
 * The friction that prevents an accidental deletion is having to read the name
 * and type it back. Demanding exact capitalisation adds no safety and just
 * makes an operator fight the box.
 */
function namesMatch(typed: string, itemName: string): boolean {
  return typed.trim().toLowerCase() === itemName.trim().toLowerCase();
}

/**
 * Replacement for `window.confirm` on destructive admin actions.
 *
 * A native confirm is dismissed by a single Enter keypress, which is how a
 * catalog gets wiped by accident. This requires the operator to type the item's
 * name, so the action cannot be completed without reading what it targets.
 */
export default function ConfirmDeleteDialog({
  open,
  itemName,
  title = 'Delete this item?',
  description = 'It moves to Recently Deleted and can be restored for 30 days.',
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState('');
  const titleId = useId();
  const inputId = useId();

  // Reopening — for this item or another — must never arrive pre-armed.
  useEffect(() => {
    if (open) setTyped('');
  }, [open, itemName]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const armed = namesMatch(typed, itemName) && !busy;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (armed) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy-900/50"
        style={{ backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-200 overflow-hidden"
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-navy-900">
              {title}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1.5">
            Type <span className="font-semibold text-navy-900">{itemName}</span> to confirm
          </label>
          <input
            id={inputId}
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!armed}
              className="px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {busy ? 'Deleting…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
