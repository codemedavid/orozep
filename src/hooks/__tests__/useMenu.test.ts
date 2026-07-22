import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Hoisted mock handles so the vi.mock factory can reference them.
const { fromMock, channelMock, removeChannelMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  channelMock: vi.fn(),
  removeChannelMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

// One product carrying its variations via an embedded PostgREST join
// (`product_variations` nested array), i.e. what a single join query returns.
const PRODUCTS_WITH_EMBED = [
  {
    id: 'p1',
    name: 'BPC-157',
    category: 'healing',
    base_price: 1500,
    available: true,
    featured: true,
    image_url: null,
    product_variations: [
      {
        id: 'v1',
        product_id: 'p1',
        name: '5mg',
        quantity_mg: 5,
        price: 1500,
        stock_quantity: 10,
      },
    ],
  },
];

/** A thenable query builder: chainable (.select/.eq/.order) and awaitable. */
function makeThenableBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.then = (resolve: (r: unknown) => unknown) => resolve(result);
  return builder;
}

function setupSupabaseMocks() {
  fromMock.mockImplementation((table: string) => {
    if (table === 'products') {
      return makeThenableBuilder({ data: PRODUCTS_WITH_EMBED, error: null });
    }
    // New implementation must NOT read product_variations separately.
    return makeThenableBuilder({ data: [], error: null });
  });

  const channelObj: Record<string, unknown> = {};
  channelObj.on = vi.fn(() => channelObj);
  channelObj.subscribe = vi.fn(() => channelObj);
  channelMock.mockReturnValue(channelObj);
}

async function loadUseMenu() {
  // Fresh module each test so the module-level cache never leaks across tests.
  vi.resetModules();
  const mod = await import('../useMenu');
  return mod.useMenu;
}

beforeEach(() => {
  vi.clearAllMocks();
  setupSupabaseMocks();
});

describe('useMenu — egress minimization', () => {
  it('loads products with a single embedded-join query (no N+1 on product_variations)', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const tablesQueried = fromMock.mock.calls.map((c) => c[0]);
    // Never fetch variations table separately — they come embedded in the products query.
    expect(tablesQueried).not.toContain('product_variations');
    // Exactly one read of the products table on mount.
    expect(tablesQueried.filter((t) => t === 'products')).toHaveLength(1);
  });

  it('maps the embedded product_variations into each product.variations', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].variations).toHaveLength(1);
    expect(result.current.products[0].variations[0].id).toBe('v1');
    // The raw embed key should not leak through as a product field.
    expect(
      (result.current.products[0] as Record<string, unknown>).product_variations
    ).toBeUndefined();
  });

  it('does NOT open a realtime subscription on the storefront (default)', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(channelMock).not.toHaveBeenCalled();
  });

  it('opens a realtime subscription when realtime is enabled (admin)', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(channelMock).toHaveBeenCalledTimes(1);
  });

  it('serves a second mount from cache without re-querying (storefront)', async () => {
    const useMenu = await loadUseMenu();

    const first = renderHook(() => useMenu());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const productsReadsAfterFirst = fromMock.mock.calls.filter((c) => c[0] === 'products').length;

    const second = renderHook(() => useMenu());
    await waitFor(() => expect(second.result.current.products).toHaveLength(1));

    const productsReadsAfterSecond = fromMock.mock.calls.filter((c) => c[0] === 'products').length;
    expect(productsReadsAfterSecond).toBe(productsReadsAfterFirst);
  });

  it('admin (realtime) always fetches fresh even when the cache is warm', async () => {
    const useMenu = await loadUseMenu();

    // Storefront mount primes the shared module cache.
    const store = renderHook(() => useMenu());
    await waitFor(() => expect(store.result.current.loading).toBe(false));
    store.unmount();
    const readsAfterStorefront = fromMock.mock.calls.filter((c) => c[0] === 'products').length;

    // Admin must NOT trust the (possibly stale) cache — it fetches fresh.
    const admin = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(admin.result.current.loading).toBe(false));
    const readsAfterAdmin = fromMock.mock.calls.filter((c) => c[0] === 'products').length;

    expect(readsAfterAdmin).toBeGreaterThan(readsAfterStorefront);
  });

  it('falls back to a products-only render when the embedded join query errors', async () => {
    const useMenu = await loadUseMenu();

    // First products query (embedded join) errors; the products-only fallback succeeds.
    let productsCall = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'products') {
        productsCall += 1;
        if (productsCall === 1) {
          return makeThenableBuilder({ data: null, error: { message: 'could not embed product_variations' } });
        }
        return makeThenableBuilder({
          data: [{ id: 'p1', name: 'BPC-157', category: 'healing', base_price: 1500, available: true, featured: true, image_url: null }],
          error: null,
        });
      }
      return makeThenableBuilder({ data: [], error: null });
    });

    const { result } = renderHook(() => useMenu());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Catalog still renders instead of going blank; variations degrade to empty.
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].variations).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
