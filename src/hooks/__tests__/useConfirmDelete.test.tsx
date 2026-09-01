import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useConfirmDelete } from '../useConfirmDelete';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';

const ITEM = 'Retatrutide 10mg';

let outcome: boolean | 'pending';

/** Minimal host wiring the hook exactly as a manager component would. */
function Host() {
  const { confirmDelete, confirmDialogProps } = useConfirmDelete();

  const onClick = async () => {
    outcome = 'pending';
    outcome = await confirmDelete({ itemName: ITEM, title: 'Delete this product?' });
  };

  return (
    <>
      <button onClick={onClick}>Delete product</button>
      <ConfirmDeleteDialog {...confirmDialogProps} />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  outcome = 'pending';
});

describe('useConfirmDelete', () => {
  it('shows no dialog until something asks for confirmation', () => {
    render(<Host />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a dialog naming the item when asked', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByRole('button', { name: 'Delete product' }));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Delete this product?');
    expect(screen.getByLabelText(/type .*to confirm/i)).toBeInTheDocument();
  });

  it('resolves true once the admin types the name and confirms', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByRole('button', { name: 'Delete product' }));
    await user.type(await screen.findByRole('textbox'), ITEM);
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(outcome).toBe(true));
  });

  it('resolves false when the admin backs out', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByRole('button', { name: 'Delete product' }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(outcome).toBe(false));
  });

  it('closes the dialog after either outcome', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByRole('button', { name: 'Delete product' }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('can be used again after a cancellation', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.click(screen.getByRole('button', { name: 'Delete product' }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(outcome).toBe(false));

    await user.click(screen.getByRole('button', { name: 'Delete product' }));
    await user.type(await screen.findByRole('textbox'), ITEM);
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(outcome).toBe(true));
  });
});
