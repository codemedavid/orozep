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

import { useOrders } from '../useOrders';

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
let listConfig: { count: number; error: unknown; deferred: boolean };
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
    const rows = statusEq
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

beforeEach(() => {
  builders.length = 0;
  pending.length = 0;
  listConfig = { count: TOTAL, error: null, deferred: false };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeBuilder());
});

describe('useOrders', () => {
  it('loads the first page of 50 orders sorted by created_at desc', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const list = lastListQuery();
    expect(list?.options).toEqual({ count: 'exact' });
    expect(list?.order).toEqual(['created_at', { ascending: false }]);
    expect(list?.range).toEqual([0, 49]);
    expect(result.current.orders).toHaveLength(2);
    expect(result.current.totalCount).toBe(TOTAL);
  });

  it('does not filter by status when the filter is "all"', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const list = lastListQuery();
    expect(list?.eq.find(([c]) => c === 'order_status')).toBeUndefined();
  });

  it('applies a server-side status filter and resets to page 1', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(lastListQuery()?.range).toEqual([100, 149]));

    act(() => result.current.setStatusFilter('shipped'));

    await waitFor(() => {
      const list = lastListQuery();
      expect(list?.eq).toContainEqual(['order_status', 'shipped']);
      expect(list?.range).toEqual([0, 49]); // page reset
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

  it('paginates via range() when the page changes', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(2));

    await waitFor(() => expect(lastListQuery()?.range).toEqual([50, 99]));
  });

  it('loads per-status counts via head-count queries', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.statusCounts.all).toBe(TOTAL);
      expect(result.current.statusCounts.new).toBe(STATUS_COUNT_MAP.new);
      expect(result.current.statusCounts.cancelled).toBe(STATUS_COUNT_MAP.cancelled);
    });
  });

  it('exposes totalPages derived from the total count and page size', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // ceil(1234 / 50) = 25
    expect(result.current.totalPages).toBe(25);
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

  it('clamps the page when the total shrinks below the current page (after deletions)', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(5));
    await waitFor(() => expect(lastListQuery()?.range).toEqual([200, 249]));

    // Deletions drop the total to a single page while we sit on page 5.
    listConfig.count = 10;
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
      expect(lastListQuery()?.range).toEqual([0, 49]);
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
