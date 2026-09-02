import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Hoisted mock handle so the vi.mock factory can reference it.
const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import { useOrders, ORDERS_FETCH_CHUNK_SIZE } from '../useOrders';

const TOTAL = 1234;
// Per-status counts returned by the head-count queries.
const STATUS_COUNT_MAP: Record<string, number> = {
  new: 10,
  confirmed: 20,
  processing: 30,
  shipped: 40,
  delivered: 50,
  cancelled: 60,
};

interface RecordedCalls {
  select?: unknown;
  options?: { count?: string; head?: boolean };
  order?: [string, unknown];
  eq: Array<[string, unknown]>;
  or?: string;
  range?: [number, number];
}

// Every builder created during the test is captured so assertions can
// inspect the exact PostgREST chain that was issued.
const builders: RecordedCalls[] = [];

// Tunable behaviour of the list (non-head) query, mutated per test.
// `rowsForRange` lets a test model a table larger than one API response so the
// chunked "fetch everything" loop can be observed end to end.
let listConfig: {
  count: number;
  error: unknown;
  deferred: boolean;
  rowsForRange?: (from: number, to: number) => unknown[];
};
// When deferred, list resolutions queue here so a test can flush them in a
// chosen order (used to reproduce out-of-order fetch races).
const pending: Array<() => void> = [];

/** A thenable query builder: chainable and awaitable, resolving to a
 *  PostgREST-shaped result derived from the recorded chain. */
function makeBuilder() {
  const calls: RecordedCalls = { eq: [] };
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn((cols: unknown, opts: RecordedCalls['options']) => {
    calls.select = cols;
    calls.options = opts;
    return builder;
  });
  builder.order = vi.fn((c: string, o: unknown) => {
    calls.order = [c, o];
    return builder;
  });
  builder.eq = vi.fn((c: string, v: unknown) => {
    calls.eq.push([c, v]);
    return builder;
  });
  builder.or = vi.fn((s: string) => {
    calls.or = s;
    return builder;
  });
  // Soft-delete filters: the list and the counts both exclude the bin.
  builder.is = vi.fn(() => builder);
  builder.not = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.range = vi.fn((f: number, t: number) => {
    calls.range = [f, t];
    return builder;
  });
  builder.then = (onFulfilled: (r: unknown) => unknown) => {
    // head:true → count-only query (no rows).
    if (calls.options?.head) {
      const statusEq = calls.eq.find(([c]) => c === 'order_status');
      const count = statusEq ? STATUS_COUNT_MAP[String(statusEq[1])] : listConfig.count;
      return onFulfilled({ data: null, error: null, count });
    }
    // list query → rows tagged with the active status filter, plus the total.
    const statusEq = calls.eq.find(([c]) => c === 'order_status');
    const [from, to] = calls.range ?? [0, 0];
    const rows = listConfig.rowsForRange
      ? listConfig.rowsForRange(from, to)
      : statusEq
        ? [{ id: `o-${statusEq[1]}`, order_status: statusEq[1], created_at: '2026-01-01T00:00:00Z' }]
        : [
            { id: 'o1', order_status: 'new', created_at: '2026-01-02T00:00:00Z' },
            { id: 'o2', order_status: 'confirmed', created_at: '2026-01-01T00:00:00Z' },
          ];
    const result = { data: rows, error: listConfig.error, count: listConfig.count };
    if (listConfig.deferred) {
      pending.push(() => onFulfilled(result));
      return;
    }
    return onFulfilled(result);
  };
  builders.push(calls);
  return builder;
}

/** The most recent list (non-head) query issued. */
function lastListQuery(): RecordedCalls | undefined {
  return [...builders].reverse().find((b) => !b.options?.head);
}

/** Every range requested by a list (non-head) query, in issue order. */
function listRanges(): Array<[number, number]> {
  return builders.filter((b) => !b.options?.head && b.range).map((b) => b.range!);
}

/** Builds `count` fake rows covering the inclusive PostgREST range. */
function rowsInRange(total: number) {
  return (from: number, to: number) =>
    Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({
      id: `o${from + i}`,
      order_status: 'new',
      created_at: '2026-01-01T00:00:00Z',
    }));
}

beforeEach(() => {
  builders.length = 0;
  pending.length = 0;
  listConfig = { count: TOTAL, error: null, deferred: false, rowsForRange: undefined };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeBuilder());
});

describe('useOrders', () => {
  it('loads every order sorted by created_at desc in a single pass', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const list = lastListQuery();
    expect(list?.options).toEqual({ count: 'exact' });
    expect(list?.order).toEqual(['created_at', { ascending: false }]);
    // One full-size chunk, not a 50-row page.
    expect(list?.range).toEqual([0, ORDERS_FETCH_CHUNK_SIZE - 1]);
    expect(result.current.orders).toHaveLength(2);
    expect(result.current.totalCount).toBe(TOTAL);
  });

  it('does not filter by status when the filter is "all"', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const list = lastListQuery();
    expect(list?.eq.find(([c]) => c === 'order_status')).toBeUndefined();
  });

  it('applies a server-side status filter and refetches the whole filtered set', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatusFilter('shipped'));

    await waitFor(() => {
      const list = lastListQuery();
      expect(list?.eq).toContainEqual(['order_status', 'shipped']);
      expect(list?.range).toEqual([0, ORDERS_FETCH_CHUNK_SIZE - 1]);
    });
  });

  it('applies a server-side ilike search across name, email, phone, order number', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('john'));

    await waitFor(() => {
      const or = lastListQuery()?.or ?? '';
      expect(or).toContain('customer_name.ilike.%john%');
      expect(or).toContain('customer_email.ilike.%john%');
      expect(or).toContain('customer_phone.ilike.%john%');
      expect(or).toContain('order_number.ilike.%john%');
    });
  });

  it('returns every order on one page, chunking past the API row cap', async () => {
    const total = ORDERS_FETCH_CHUNK_SIZE * 2 + 17;
    listConfig.count = total;
    listConfig.rowsForRange = rowsInRange(total);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.orders).toHaveLength(total);
    expect(result.current.orders[0]?.id).toBe('o0');
    expect(result.current.orders[total - 1]?.id).toBe(`o${total - 1}`);
    expect(listRanges()).toEqual([
      [0, ORDERS_FETCH_CHUNK_SIZE - 1],
      [ORDERS_FETCH_CHUNK_SIZE, ORDERS_FETCH_CHUNK_SIZE * 2 - 1],
      [ORDERS_FETCH_CHUNK_SIZE * 2, ORDERS_FETCH_CHUNK_SIZE * 3 - 1],
    ]);
  });

  it('stops requesting chunks as soon as a short one comes back', async () => {
    const total = ORDERS_FETCH_CHUNK_SIZE + 5;
    listConfig.count = total;
    listConfig.rowsForRange = rowsInRange(total);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.orders).toHaveLength(total);
    expect(listRanges()).toHaveLength(2);
  });

  it('loads per-status counts via head-count queries', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.statusCounts.all).toBe(TOTAL);
      expect(result.current.statusCounts.new).toBe(STATUS_COUNT_MAP.new);
      expect(result.current.statusCounts.cancelled).toBe(STATUS_COUNT_MAP.cancelled);
    });
  });

  it('exposes no pagination surface at all', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const api = result.current as Record<string, unknown>;
    expect(api.page).toBeUndefined();
    expect(api.setPage).toBeUndefined();
    expect(api.totalPages).toBeUndefined();
    expect(api.pageSize).toBeUndefined();
  });

  // ---- Fixes for review findings ----

  it('strips SQL wildcard characters (including underscore) from the search term', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('john_doe'));

    await waitFor(() => {
      const or = lastListQuery()?.or ?? '';
      // The underscore is a single-char ILIKE wildcard; it must be stripped from
      // the user's term (column names legitimately contain underscores).
      expect(or).toContain('%john doe%');
      expect(or).not.toContain('john_doe');
    });
  });

  it('still shows the whole list after deletions shrink the total', async () => {
    listConfig.count = ORDERS_FETCH_CHUNK_SIZE + 5;
    listConfig.rowsForRange = rowsInRange(ORDERS_FETCH_CHUNK_SIZE + 5);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.orders).toHaveLength(ORDERS_FETCH_CHUNK_SIZE + 5));

    listConfig.count = 3;
    listConfig.rowsForRange = rowsInRange(3);
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(3);
      expect(result.current.totalCount).toBe(3);
    });
  });

  it('ignores a stale in-flight response when a newer query resolves first', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    listConfig.deferred = true;

    act(() => result.current.setStatusFilter('new'));
    act(() => result.current.setStatusFilter('shipped'));

    await waitFor(() => expect(pending.length).toBeGreaterThanOrEqual(2));

    // Resolve the newer ('shipped') request first, then the stale ('new') one.
    const shipped = pending.pop()!;
    const stale = pending.shift()!;
    act(() => shipped());
    act(() => stale());

    await waitFor(() => expect(result.current.loading).toBe(false));
    // The stale 'new' response must not overwrite the 'shipped' results.
    expect(result.current.orders[0]?.id).toBe('o-shipped');
  });

  it('surfaces an error message when the list query fails', async () => {
    listConfig.error = new Error('boom');
    const { result } = renderHook(() => useOrders());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('boom');
    expect(result.current.orders).toEqual([]);
  });
});
