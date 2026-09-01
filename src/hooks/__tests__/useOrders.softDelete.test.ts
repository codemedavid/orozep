import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../../lib/supabase', () => ({ supabase: { from: fromMock } }));

const BUILDER_METHODS = [
  'select', 'eq', 'is', 'not', 'in', 'neq', 'or', 'order', 'range', 'update', 'delete',
] as const;

let calls: { table: string; method: string; args: unknown[] }[];

/** Thenable query builder that records every call, tagged with its table. */
function makeRecordingBuilder(table: string, result: Record<string, unknown>) {
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

function callsFor(method: string) {
  return calls.filter((c) => c.table === 'orders' && c.method === method);
}

beforeEach(() => {
  vi.clearAllMocks();
  calls = [];
  fromMock.mockImplementation((table: string) =>
    makeRecordingBuilder(table, { data: [], error: null, count: 0 })
  );
});

async function loadHook() {
  vi.resetModules();
  const { useOrders } = await import('../useOrders');
  const rendered = renderHook(() => useOrders());
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

describe('useOrders — the bin is excluded from the working list', () => {
  it('leaves binned orders out of the paged list query', async () => {
    await loadHook();

    expect(callsFor('is').some((c) => c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true);
  });

  it('leaves binned orders out of the status counts, so the tiles stay honest', async () => {
    await loadHook();

    // One filtered count per status plus the "all" count; every one must exclude
    // the bin or the tiles disagree with the list beneath them.
    const nullChecks = callsFor('is').filter((c) => c.args[0] === 'deleted_at');
    expect(nullChecks.length).toBeGreaterThanOrEqual(7);
  });
});

describe('useOrders — deleting sends orders to the bin', () => {
  it('never issues a hard DELETE for a selection', async () => {
    const { result } = await loadHook();

    await act(async () => {
      await result.current.deleteOrders(['order-1', 'order-2']);
    });

    expect(callsFor('delete')).toHaveLength(0);
  });

  it('stamps deleted_at on the selected orders', async () => {
    const { result } = await loadHook();

    await act(async () => {
      await result.current.deleteOrders(['order-1', 'order-2']);
    });

    const updates = callsFor('update');
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.deleted_at).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(payload.deleted_at as string))).toBe(false);
  });

  it('targets exactly the orders the admin selected', async () => {
    const { result } = await loadHook();

    await act(async () => {
      await result.current.deleteOrders(['order-1', 'order-2']);
    });

    expect(callsFor('in').some((c) => c.args[0] === 'id')).toBe(true);
  });

  it('reports success to the caller', async () => {
    const { result } = await loadHook();

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.deleteOrders(['order-1']);
    });

    expect(outcome?.success).toBe(true);
  });

  it('does nothing at all when given an empty selection', async () => {
    const { result } = await loadHook();
    calls = [];

    await act(async () => {
      await result.current.deleteOrders([]);
    });

    expect(callsFor('update')).toHaveLength(0);
  });

  it('exposes no way to remove every order at once', async () => {
    const { result } = await loadHook();

    // Deliberately absent. A one-click wipe of the orders table has no
    // legitimate operational use and this store has been emptied twice.
    expect(Object.keys(result.current)).not.toContain('deleteAllOrders');
  });
});

describe('useOrders — the bin itself', () => {
  it('lists binned orders, newest removal first', async () => {
    const { result } = await loadHook();
    calls = [];

    await act(async () => {
      await result.current.fetchDeletedOrders();
    });

    expect(callsFor('not').some((c) => c.args[0] === 'deleted_at')).toBe(true);
    expect(callsFor('order').some((c) => c.args[0] === 'deleted_at')).toBe(true);
  });

  it('restores an order by clearing its stamp', async () => {
    const { result } = await loadHook();

    await act(async () => {
      await result.current.restoreOrder('order-1');
    });

    const updates = callsFor('update');
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.deleted_at).toBeNull();
    expect(payload.deleted_by).toBeNull();
  });

  it('restores only the order asked for', async () => {
    const { result } = await loadHook();

    await act(async () => {
      await result.current.restoreOrder('order-1');
    });

    expect(callsFor('eq').some((c) => c.args[0] === 'id' && c.args[1] === 'order-1')).toBe(true);
  });
});
