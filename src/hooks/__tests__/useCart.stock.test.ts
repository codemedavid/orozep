import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { CartItem } from '../../types';
import {
  mockProduct,
  mockProductNoVariations,
  mockProductOutOfStock,
  mockVariation,
  mockVariationDiscounted,
} from '../../test/fixtures';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../../lib/supabase', () => ({
  supabase: { from: fromMock },
}));

import { useCart } from '../useCart';

// Shapes of the rows the cart revalidation query reads back.
interface ProductRow {
  id: string;
  available: boolean;
  stock_quantity: number;
}
interface VariationRow {
  id: string;
  stock_quantity: number;
}

/** A thenable PostgREST-style builder: chainable (.select/.in) and awaitable. */
function makeThenableBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.then = (resolve: (r: unknown) => unknown) => resolve(result);
  return builder;
}

function setupSupabase(products: ProductRow[], variations: VariationRow[] = []) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'products') {
      return makeThenableBuilder({ data: products, error: null });
    }
    if (table === 'product_variations') {
      return makeThenableBuilder({ data: variations, error: null });
    }
    return makeThenableBuilder({ data: [], error: null });
  });
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
window.alert = vi.fn();

/** Mounts useCart with a cart already saved in localStorage, as a returning shopper has. */
function mountWithSavedCart(items: CartItem[]) {
  localStorageMock.getItem.mockReturnValue(JSON.stringify(items));
  return renderHook(() => useCart());
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

describe('useCart — drops items that sold out, on load', () => {
  it('removes a saved cart item whose product stock has fallen to zero', async () => {
    setupSupabase([
      { id: 'prod-2', available: true, stock_quantity: 15 },
      { id: 'prod-3', available: true, stock_quantity: 0 },
    ]);

    const { result } = mountWithSavedCart([
      { product: mockProductNoVariations, quantity: 1 },
      { product: mockProductOutOfStock, quantity: 1 },
    ]);

    await waitFor(() => expect(result.current.cartItems).toHaveLength(1));
    expect(result.current.cartItems[0].product.id).toBe('prod-2');
  });

  it('keeps every saved item when all of them still have stock', async () => {
    setupSupabase(
      [{ id: 'prod-1', available: true, stock_quantity: 20 }],
      [{ id: 'var-1', stock_quantity: 10 }]
    );

    const { result } = mountWithSavedCart([
      { product: mockProduct, variation: mockVariation, quantity: 2 },
    ]);

    await waitFor(() => expect(result.current.cartItems).toHaveLength(1));
    expect(result.current.cartItems[0].quantity).toBe(2);
  });
});

describe('useCart — validateCart at checkout', () => {
  it('reports and removes the sold-out size while keeping the size still in stock', async () => {
    // Both sizes are healthy when the cart loads.
    setupSupabase(
      [{ id: 'prod-1', available: true, stock_quantity: 20 }],
      [
        { id: 'var-1', stock_quantity: 10 },
        { id: 'var-2', stock_quantity: 5 },
      ]
    );

    const { result } = mountWithSavedCart([
      { product: mockProduct, variation: mockVariation, quantity: 1 },
      { product: mockProduct, variation: mockVariationDiscounted, quantity: 1 },
    ]);
    await waitFor(() => expect(result.current.cartItems).toHaveLength(2));

    // The 10mg size sells out while the shopper is checking out.
    setupSupabase(
      [{ id: 'prod-1', available: true, stock_quantity: 20 }],
      [
        { id: 'var-1', stock_quantity: 10 },
        { id: 'var-2', stock_quantity: 0 },
      ]
    );

    let removed: string[] = [];
    await act(async () => {
      removed = await result.current.validateCart();
    });

    expect(removed).toEqual(['BPC-157 (10mg)']);
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].variation?.id).toBe('var-1');
  });

  it('ignores the parent stock column when the cart item has a variation', async () => {
    // Parent row reads 0 (stale legacy column) but the chosen size has 10 units.
    setupSupabase(
      [{ id: 'prod-1', available: true, stock_quantity: 0 }],
      [{ id: 'var-1', stock_quantity: 10 }]
    );

    const { result } = mountWithSavedCart([
      { product: mockProduct, variation: mockVariation, quantity: 1 },
    ]);
    await waitFor(() => expect(result.current.cartItems).toHaveLength(1));

    let removed: string[] = [];
    await act(async () => {
      removed = await result.current.validateCart();
    });

    expect(removed).toEqual([]);
    expect(result.current.cartItems).toHaveLength(1);
  });

  it('reports a product with no variations that sold out', async () => {
    setupSupabase([{ id: 'prod-2', available: true, stock_quantity: 15 }]);

    const { result } = mountWithSavedCart([
      { product: mockProductNoVariations, quantity: 1 },
    ]);
    await waitFor(() => expect(result.current.cartItems).toHaveLength(1));

    setupSupabase([{ id: 'prod-2', available: true, stock_quantity: 0 }]);

    let removed: string[] = [];
    await act(async () => {
      removed = await result.current.validateCart();
    });

    expect(removed).toEqual(['TB-500']);
    expect(result.current.cartItems).toHaveLength(0);
  });

  it('leaves the cart untouched when the stock lookup fails', async () => {
    setupSupabase([{ id: 'prod-2', available: true, stock_quantity: 15 }]);

    const { result } = mountWithSavedCart([
      { product: mockProductNoVariations, quantity: 1 },
    ]);
    await waitFor(() => expect(result.current.cartItems).toHaveLength(1));

    fromMock.mockImplementation(() =>
      makeThenableBuilder({ data: null, error: { message: 'network down' } })
    );

    let removed: string[] = [];
    await act(async () => {
      removed = await result.current.validateCart();
    });

    // Fail open: a transient outage must not silently empty a shopper's cart.
    expect(removed).toEqual([]);
    expect(result.current.cartItems).toHaveLength(1);
  });
});
