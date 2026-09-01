import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ConfirmDeleteDialog from '../ConfirmDeleteDialog';

const ITEM = 'Retatrutide 10mg';

let onConfirm: ReturnType<typeof vi.fn>;
let onCancel: ReturnType<typeof vi.fn>;

function renderDialog(overrides: Record<string, unknown> = {}) {
  return render(
    <ConfirmDeleteDialog
      open
      itemName={ITEM}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  );
}

/** The confirm control, distinguished from Cancel. */
function confirmButton() {
  return screen.getByRole('button', { name: /^delete$/i });
}

beforeEach(() => {
  vi.clearAllMocks();
  onConfirm = vi.fn();
  onCancel = vi.fn();
});

describe('ConfirmDeleteDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names exactly what is about to be deleted', () => {
    renderDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(ITEM, 'i')).length).toBeGreaterThan(0);
  });

  it('keeps the delete control disabled until the name is typed', () => {
    renderDialog();

    expect(confirmButton()).toBeDisabled();
  });

  it('stays disabled for a near-miss such as a partial name', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole('textbox'), 'Retatrutide');

    expect(confirmButton()).toBeDisabled();
  });

  it('enables the delete control once the name matches', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole('textbox'), ITEM);

    expect(confirmButton()).toBeEnabled();
  });

  it('forgives surrounding whitespace and casing, since the friction is retyping the name', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole('textbox'), '  retatrutide 10MG  ');

    expect(confirmButton()).toBeEnabled();
  });

  it('deletes only when the admin has typed the name', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole('textbox'), ITEM);
    await user.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not delete when Enter is pressed on a name that does not match', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole('textbox'), 'Retatrutide{Enter}');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('backs out through Cancel', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('backs out on Escape', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clears the typed name when reopened for a different item', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDialog();

    await user.type(screen.getByRole('textbox'), ITEM);
    expect(confirmButton()).toBeEnabled();

    // Closing and reopening for another product must not arrive pre-armed.
    rerender(
      <ConfirmDeleteDialog open={false} itemName={ITEM} onConfirm={onConfirm} onCancel={onCancel} />
    );
    rerender(
      <ConfirmDeleteDialog open itemName="GHK-Cu 50mg" onConfirm={onConfirm} onCancel={onCancel} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(confirmButton()).toBeDisabled();
  });

  it('blocks a second delete while the first is still running', async () => {
    const user = userEvent.setup();
    renderDialog({ busy: true });

    await user.type(screen.getByRole('textbox'), ITEM);

    expect(confirmButton()).toBeDisabled();
  });

  it('is an accessible modal dialog with a name', () => {
    renderDialog({ title: 'Delete product' });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Delete product');
  });

  it('labels the confirmation input so it is reachable without a mouse', () => {
    renderDialog();

    expect(screen.getByLabelText(/type .*to confirm/i)).toBeInTheDocument();
  });
});
