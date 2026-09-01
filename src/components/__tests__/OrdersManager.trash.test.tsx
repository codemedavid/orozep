import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { useOrdersMock } = vi.hoisted(() => ({ useOrdersMock: vi.fn() }));

vi.mock('../../hooks/useOrders', () => ({
  useOrders: () => useOrdersMock(),
  ORDERS_PAGE_SIZE: 50,
  ORDER_STATUSES: ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
}));
vi.mock('../../hooks/useMenu', () => ({ useMenu: () => ({ refreshProducts: vi.fn() }) }));
vi.mock('../../hooks/useCouriers', () => ({ useCouriers: () => ({ couriers: [], loading: false }) }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

import OrdersManager from '../OrdersManager';

/** ISO stamp `n` days before now, so the purge countdown is deterministic. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    customer_name: 'Jane Dela Cruz',
    customer_email: 'jane@example.com',
    customer_phone: '09170000000',
    shipping_address: '1 Test St',
    shipping_barangay: null,
    shipping_city: 'Manila',
    shipping_state: 'NCR',
    shipping_zip_code: '1000',
    shipping_country: 'Philippines',
    shipping_location: null,
    shipping_fee: 0,
    order_items: [],
    total_price: 1500,
    payment_method_id: null,
    payment_method_name: 'GCash',
    payment_proof_url: null,
    contact_method: null,
    order_status: 'new',
    payment_status: 'pending',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    tracking_number: null,
    shipping_provider: null,
    shipping_note: null,
    promo_code: null,
    discount_applied: null,
    order_number: 'ORZ-001',
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

const BINNED_RECENT = order({
  id: 'order-9',
  order_number: 'ORZ-009',
  customer_name: 'Maria Santos',
  deleted_at: daysAgo(2),
});

const BINNED_NEARLY_PURGED = order({
  id: 'order-8',
  order_number: 'ORZ-008',
  customer_name: 'Pedro Reyes',
  deleted_at: daysAgo(29),
});

let fetchDeletedOrders: ReturnType<typeof vi.fn>;
let restoreOrder: ReturnType<typeof vi.fn>;

function setupHook(binContents: unknown[][] = [[BINNED_RECENT, BINNED_NEARLY_PURGED]]) {
  let call = 0;
  fetchDeletedOrders = vi.fn(async () => binContents[Math.min(call++, binContents.length - 1)]);
  restoreOrder = vi.fn(async () => ({ success: true }));
  useOrdersMock.mockReturnValue({
    orders: [order()],
    loading: false,
    page: 1,
    pageSize: 50,
    totalCount: 1,
    totalPages: 1,
    statusCounts: { all: 1, new: 1, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
    statusFilter: 'all',
    searchQuery: '',
    error: null,
    setPage: vi.fn(),
    setStatusFilter: vi.fn(),
    setSearchQuery: vi.fn(),
    refresh: vi.fn(async () => {}),
    deleteOrders: vi.fn(async () => ({ success: true })),
    fetchDeletedOrders,
    restoreOrder,
  });
}

async function openTrash(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /recently deleted/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe('OrdersManager — Recently Deleted', () => {
  it('offers a way into the bin from the orders screen', async () => {
    render(<OrdersManager onBack={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /recently deleted/i })).toBeInTheDocument();
  });

  it('lists the orders sitting in the bin', async () => {
    const user = userEvent.setup();
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);

    expect(await screen.findByText(/ORZ-009/)).toBeInTheDocument();
    expect(screen.getByText(/Maria Santos/)).toBeInTheDocument();
    expect(screen.getByText(/ORZ-008/)).toBeInTheDocument();
  });

  it('tells the admin how long each order has left', async () => {
    const user = userEvent.setup();
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);

    expect(await screen.findByText(/28 days left/i)).toBeInTheDocument();
    expect(screen.getByText(/1 day left/i)).toBeInTheDocument();
  });

  it('restores the order the admin picked', async () => {
    const user = userEvent.setup();
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);
    await screen.findByText(/ORZ-009/);
    await user.click(screen.getAllByRole('button', { name: /restore/i })[0]);

    expect(restoreOrder).toHaveBeenCalledWith('order-9');
  });

  it('drops the order from the bin once restored', async () => {
    const user = userEvent.setup();
    setupHook([[BINNED_RECENT, BINNED_NEARLY_PURGED], [BINNED_NEARLY_PURGED]]);
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);
    await screen.findByText(/ORZ-009/);
    await user.click(screen.getAllByRole('button', { name: /restore/i })[0]);

    await waitFor(() => expect(screen.queryByText(/ORZ-009/)).not.toBeInTheDocument());
    expect(screen.getByText(/ORZ-008/)).toBeInTheDocument();
  });

  it('says so plainly when the bin is empty', async () => {
    const user = userEvent.setup();
    setupHook([[]]);
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);

    expect(await screen.findByText(/nothing in the bin/i)).toBeInTheDocument();
  });

  it('goes back to the orders list', async () => {
    const user = userEvent.setup();
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);
    await screen.findByText(/ORZ-009/);
    await user.click(screen.getByRole('button', { name: /back to orders/i }));

    await waitFor(() => expect(screen.queryByText(/ORZ-009/)).not.toBeInTheDocument());
  });

  it('offers no permanent purge from the recovery screen', async () => {
    const user = userEvent.setup();
    render(<OrdersManager onBack={vi.fn()} />);

    await openTrash(user);
    await screen.findByText(/ORZ-009/);

    expect(screen.queryByRole('button', { name: /forever|permanently|purge/i })).toBeNull();
  });
});

describe('OrdersManager — there is no way to wipe every order', () => {
  it('offers no delete-all control at all', async () => {
    render(<OrdersManager onBack={vi.fn()} />);

    await screen.findByText(/ORZ-001/);

    // Removed outright rather than guarded. A single control that empties the
    // orders table has no legitimate day-to-day use, and the store has been
    // wiped twice already.
    expect(screen.queryByRole('button', { name: /delete all/i })).toBeNull();
    expect(screen.queryByText(/delete all orders/i)).toBeNull();
  });
});

describe('OrdersManager — deletion prompts now tell the truth', () => {
  it('says a deleted order is recoverable, because it is', async () => {
    const user = userEvent.setup();
    render(<OrdersManager onBack={vi.fn()} />);

    await user.click(await screen.findByLabelText(/select page/i));
    await user.click(screen.getByRole('button', { name: /delete selected/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/recently deleted|restored|recover/i)).toBeInTheDocument();
  });
});
