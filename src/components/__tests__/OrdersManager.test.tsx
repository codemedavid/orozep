import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Hoisted handle so the useOrders mock factory can reference it.
const { useOrdersMock } = vi.hoisted(() => ({ useOrdersMock: vi.fn() }));

vi.mock('../../hooks/useOrders', () => ({
  useOrders: () => useOrdersMock(),
  ORDERS_PAGE_SIZE: 50,
}));
vi.mock('../../hooks/useMenu', () => ({
  useMenu: () => ({ refreshProducts: vi.fn() }),
}));
vi.mock('../../hooks/useCouriers', () => ({
  useCouriers: () => ({ couriers: [] }),
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
  tracking_number: null,
  shipping_provider: null,
  shipping_note: null,
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

beforeEach(() => {
  useOrdersMock.mockReset();
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
