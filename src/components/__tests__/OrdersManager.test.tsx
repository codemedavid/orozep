import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Hoisted handles so the mock factories can reference them.
const { useOrdersMock, useCouriersMock } = vi.hoisted(() => ({
  useOrdersMock: vi.fn(),
  useCouriersMock: vi.fn(),
}));

vi.mock('../../hooks/useOrders', () => ({
  useOrders: () => useOrdersMock(),
  ORDERS_PAGE_SIZE: 50,
}));
vi.mock('../../hooks/useMenu', () => ({
  useMenu: () => ({ refreshProducts: vi.fn() }),
}));
vi.mock('../../hooks/useCouriers', () => ({
  useCouriers: () => useCouriersMock(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

import OrdersManager from '../OrdersManager';

const SAMPLE_ORDER = {
  id: 'order-1111-2222-3333-444455556666',
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
  order_items: [
    { product_id: 'p1', product_name: 'BPC-157', variation_id: null, variation_name: null, quantity: 1, price: 1500, total: 1500 },
  ],
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
  tracking_number: null as string | null,
  shipping_provider: null as string | null,
  shipping_note: null as string | null,
  promo_code: null,
  discount_applied: null,
  order_number: 'ORD-001',
};

function hookValue(overrides: Record<string, unknown> = {}) {
  return {
    orders: [],
    loading: false,
    page: 1,
    totalPages: 1,
    totalCount: 0,
    statusCounts: { all: 0, new: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
    statusFilter: 'all',
    searchQuery: '',
    error: null,
    setPage: vi.fn(),
    setStatusFilter: vi.fn(),
    setSearchQuery: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  };
}

// The shop's live courier list: the admin deleted LBC, so only J&T remains.
const JNT_COURIER = {
  id: 'courier-jnt',
  name: 'J&T Express',
  code: 'jnt',
  tracking_url_template: 'https://www.jtexpress.ph/trajectoryQuery?bills={tracking}',
  is_active: true,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
};

async function openOrderDetails(order = SAMPLE_ORDER) {
  const user = userEvent.setup();
  useOrdersMock.mockReturnValue(hookValue({ orders: [order], totalCount: 1, totalPages: 1 }));

  render(<OrdersManager onBack={() => {}} />);
  await user.click(screen.getByRole('button', { name: /view details/i }));

  return user;
}

beforeEach(() => {
  useOrdersMock.mockReset();
  useCouriersMock.mockReset();
  useCouriersMock.mockReturnValue({ couriers: [JNT_COURIER] });
});

describe('OrdersManager', () => {
  it('surfaces an error message when loading orders fails', () => {
    useOrdersMock.mockReturnValue(hookValue({ error: 'Network unreachable', loading: false }));

    render(<OrdersManager onBack={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to load orders/i);
    expect(alert).toHaveTextContent(/network unreachable/i);
  });

  it('keeps the orders list visible during a background refresh (no full-page spinner)', () => {
    useOrdersMock.mockReturnValue(
      hookValue({ loading: true, orders: [SAMPLE_ORDER], totalCount: 1, totalPages: 1 }),
    );

    render(<OrdersManager onBack={() => {}} />);

    // The existing order must stay on screen while a refresh runs...
    expect(screen.getByText('Jane Dela Cruz')).toBeInTheDocument();
    // ...and the initial-load full-page spinner must NOT take over.
    expect(screen.queryByText(/loading orders/i)).not.toBeInTheDocument();
  });

  it('shows the full-page spinner only on the initial load (loading with no orders yet)', () => {
    useOrdersMock.mockReturnValue(hookValue({ loading: true, orders: [] }));

    render(<OrdersManager onBack={() => {}} />);

    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
  });
});

describe('OrdersManager courier selection', () => {
  it('defaults an order with no courier to a courier that actually exists', async () => {
    // Regression: the form defaulted to 'lbc'. With LBC deleted there is no
    // matching <option>, so the select displayed "J&T Express" while the form
    // state stayed 'lbc' — saving wrote 'lbc' to the order.
    await openOrderDetails();

    expect(screen.getByLabelText(/courier/i)).toHaveValue('jnt');
  });

  it('does not offer a courier the admin deleted', async () => {
    await openOrderDetails();

    expect(screen.queryByRole('option', { name: /LBC/i })).not.toBeInTheDocument();
  });

  it('replaces a stored courier that no longer exists so the form matches what is saved', async () => {
    await openOrderDetails({ ...SAMPLE_ORDER, shipping_provider: 'lbc', tracking_number: '600017794686' });

    // The displayed selection and the value that would be submitted must agree.
    expect(screen.getByLabelText(/courier/i)).toHaveValue('jnt');
  });

  it('forces an explicit choice when no courier is available to default to', async () => {
    useCouriersMock.mockReturnValue({ couriers: [] });

    await openOrderDetails();

    const select = screen.getByLabelText(/courier/i);
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: /select a courier/i })).toBeInTheDocument();
  });
});
