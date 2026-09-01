import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

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

const LIVE_PRODUCT = {
  id: 'p1',
  name: 'Retatrutide 10mg',
  category: 'weight',
  base_price: 1500,
  available: true,
  featured: false,
  image_url: null,
  stock_quantity: 12,
  deleted_at: null,
  deleted_by: null,
  product_variations: [
    { id: 'v1', product_id: 'p1', name: '5mg', quantity_mg: 5, price: 1500, stock_quantity: 10 },
  ],
};

const BUILDER_METHODS = [
  'select', 'eq', 'is', 'not', 'order', 'update', 'delete', 'insert', 'single',
] as const;

let calls: { table: string; method: string; args: unknown[] }[];

/** A thenable query builder that records every call, tagged with its table. */
function makeRecordingBuilder(table: string, result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of BUILDER_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args });
      return builder;
    });
  }
  builder.then = (resolve: (r: unknown) => unknown) => resolve(result);
  return builder;
}

function setupSupabaseMocks() {
  calls = [];
  fromMock.mockImplementation((table: string) =>
    makeRecordingBuilder(table, { data: table === 'products' ? [LIVE_PRODUCT] : [], error: null })
  );

  const channelObj: Record<string, unknown> = {};
  channelObj.on = vi.fn(() => channelObj);
  channelObj.subscribe = vi.fn(() => channelObj);
  channelMock.mockReturnValue(channelObj);
}

async function loadUseMenu() {
  vi.resetModules();
  const mod = await import('../useMenu');
  return mod.useMenu;
}

function callsFor(table: string, method: string) {
  return calls.filter((c) => c.table === table && c.method === method);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupSupabaseMocks();
});

describe('useMenu — deleting a product sends it to the Recently Deleted bin', () => {
  it('never issues a hard DELETE against the products table', async () => {
    // Arrange
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    await act(async () => {
      await result.current.deleteProduct('p1');
    });

    // Assert: a wiped catalog must be recoverable, so nothing is ever destroyed.
    expect(callsFor('products', 'delete')).toHaveLength(0);
  });

  it('stamps deleted_at on the product row instead', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteProduct('p1');
    });

    const updates = callsFor('products', 'update');
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.deleted_at).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(payload.deleted_at as string))).toBe(false);
  });

  it('targets only the requested product id', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteProduct('p1');
    });

    expect(callsFor('products', 'eq').some((c) => c.args[0] === 'id' && c.args[1] === 'p1')).toBe(true);
  });

  it('reports success to the caller', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.deleteProduct('p1');
    });

    expect(outcome?.success).toBe(true);
  });

  it('soft-deletes variations too, so restoring a product brings its stock back', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteVariation('v1');
    });

    expect(callsFor('product_variations', 'delete')).toHaveLength(0);
    const updates = callsFor('product_variations', 'update');
    expect(updates).toHaveLength(1);
    expect((updates[0].args[0] as Record<string, unknown>).deleted_at).toEqual(expect.any(String));
  });
});

describe('useMenu — restoring from the Recently Deleted bin', () => {
  it('clears deleted_at so the product returns to the catalog', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.restoreProduct('p1');
    });

    const updates = callsFor('products', 'update');
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.deleted_at).toBeNull();
    expect(payload.deleted_by).toBeNull();
  });

  it('reports success to the caller', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.restoreProduct('p1');
    });

    expect(outcome?.success).toBe(true);
  });
});

describe('useMenu — reading the catalog', () => {
  it('excludes soft-deleted rows from the products query', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Filtering in SQL, not in JS: deleted rows must never cross the wire.
    expect(
      callsFor('products', 'is').some((c) => c.args[0] === 'deleted_at' && c.args[1] === null)
    ).toBe(true);
  });

  it('lists the bin contents for the admin recycle view', async () => {
    const useMenu = await loadUseMenu();
    const { result } = renderHook(() => useMenu({ realtime: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchDeletedProducts();
    });

    // The bin asks for rows WITH a deleted_at, i.e. `not is null`.
    expect(callsFor('products', 'not').length + callsFor('products', 'is').length).toBeGreaterThan(0);
  });
});
