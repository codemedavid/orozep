import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { useMenuMock, useCategoriesMock } = vi.hoisted(() => ({
  useMenuMock: vi.fn(),
  useCategoriesMock: vi.fn(),
}));

vi.mock('../../hooks/useMenu', () => ({ useMenu: () => useMenuMock() }));
vi.mock('../../hooks/useCategories', () => ({ useCategories: () => useCategoriesMock() }));

// loadOrders() reads the orders table for the sales figures; it is not under test.
vi.mock('../../lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.then = (resolve: (r: unknown) => unknown) => resolve({ data: [], error: null });
  return { supabase: { from: vi.fn(() => builder) } };
});

import PeptideInventoryManager from '../PeptideInventoryManager';

const PRODUCT = {
  id: 'prod-1',
  name: 'Retatrutide 10mg',
  description: 'Weight management peptide',
  category: 'cat-1',
  base_price: 1500,
  discount_price: null,
  discount_active: false,
  stock_quantity: 12,
  available: true,
  featured: false,
  image_url: null,
  variations: [],
};

let deleteProduct: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  deleteProduct = vi.fn(async () => ({ success: true }));
  useMenuMock.mockReturnValue({
    products: [PRODUCT],
    loading: false,
    refreshProducts: vi.fn(async () => {}),
    deleteProduct,
    deleteVariation: vi.fn(async () => ({ success: true })),
  });
  useCategoriesMock.mockReturnValue({ categories: [{ id: 'cat-1', name: 'Weight' }] });
});

describe('PeptideInventoryManager — deleting a product', () => {
  it('renders the inventory with its delete control in reach', async () => {
    render(<PeptideInventoryManager onBack={vi.fn()} />);

    expect(await screen.findByText('Retatrutide 10mg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('asks the admin to type the product name instead of deleting straight away', async () => {
    const user = userEvent.setup();
    render(<PeptideInventoryManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    // The dialog must mount inside this component's tree — a scope mistake here
    // throws at runtime and the build will not catch it.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(/delete this product/i);
    expect(screen.getByLabelText(/type .*to confirm/i)).toBeInTheDocument();
    expect(deleteProduct).not.toHaveBeenCalled();
  });

  it('deletes only after the name has been typed', async () => {
    const user = userEvent.setup();
    render(<PeptideInventoryManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    // Two "Delete" controls exist once the dialog is open: the card's and the
    // dialog's. Scope to the dialog so the assertion cannot drift.
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Retatrutide 10mg');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(deleteProduct).toHaveBeenCalledWith('prod-1');
  });

  it('leaves the product alone when the admin backs out', async () => {
    const user = userEvent.setup();
    render(<PeptideInventoryManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    expect(deleteProduct).not.toHaveBeenCalled();
  });

  it('tells the admin the product is recoverable rather than gone', async () => {
    const user = userEvent.setup();
    render(<PeptideInventoryManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText(/recently deleted/i)).toBeInTheDocument();
  });
});
