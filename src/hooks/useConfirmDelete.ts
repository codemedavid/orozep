import { useCallback, useRef, useState } from 'react';

/** What the admin is being asked to confirm. */
export interface ConfirmDeleteRequest {
  /** The name the admin must retype before the action arms. */
  itemName: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * Promise-based replacement for `window.confirm` on destructive actions.
 *
 * Deliberately shaped as a drop-in: a call site changes from
 *
 *     if (confirm('Are you sure?')) { ... }
 *
 * to
 *
 *     if (await confirmDelete({ itemName: product.name })) { ... }
 *
 * so the existing body is untouched. Spread `confirmDialogProps` onto a
 * `ConfirmDeleteDialog` somewhere in the component's tree.
 */
export function useConfirmDelete() {
  const [request, setRequest] = useState<ConfirmDeleteRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmDelete = useCallback(
    (next: ConfirmDeleteRequest) =>
      new Promise<boolean>((resolve) => {
        // A pending request is superseded rather than left dangling, so the
        // awaiting caller can never hang.
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest(next);
      }),
    []
  );

  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  const confirmDialogProps = {
    open: request !== null,
    itemName: request?.itemName ?? '',
    title: request?.title,
    description: request?.description,
    confirmLabel: request?.confirmLabel,
    onConfirm: () => settle(true),
    onCancel: () => settle(false),
  };

  return { confirmDelete, confirmDialogProps };
}
