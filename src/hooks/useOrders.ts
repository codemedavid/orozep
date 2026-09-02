import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderItem {
  product_id: string;
  product_name: string;
  variation_id: string | null;
  variation_name: string | null;
  quantity: number;
  price: number;
  total: number;
  purity_percentage?: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_barangay: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  shipping_country: string;
  shipping_location: string | null;
  shipping_fee: number | null;
  order_items: OrderItem[];
  total_price: number;
  payment_method_id: string | null;
  payment_method_name: string | null;
  payment_proof_url: string | null;
  contact_method: string | null;
  order_status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  shipping_provider: string | null;
  shipping_note: string | null;
  promo_code: string | null;
  discount_applied: number | null;
  order_number: string | null;

  // Soft deletion — see utils/recycleBin.ts. Null/absent means live.
  deleted_at?: string | null;
  deleted_by?: string | null;
}

// Statuses shown as filter tiles, in display order.
export const ORDER_STATUSES = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StatusCounts = { all: number } & Record<OrderStatus, number>;

const EMPTY_COUNTS: StatusCounts = {
  all: 0,
  new: 0,
  confirmed: 0,
  processing: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
};

/** Rows pulled per request while assembling the full list. PostgREST caps a
 *  single response at 1000 rows, so a larger table is walked in chunks of this
 *  size and stitched back together — the admin still sees one unbroken list. */
export const ORDERS_FETCH_CHUNK_SIZE = 1000;

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Strip characters that would break PostgREST's `or()` filter grammar
 * (comma separates filters; parentheses group them). `%` and `*` are
 * wildcards we do not want a searching user to inject.
 */
function sanitizeSearch(query: string): string {
  // `_` and `%`/`*` are ILIKE wildcards; `,()` break the or() grammar.
  return query.replace(/[,()*%_]/g, ' ').trim();
}

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  totalCount: number;
  statusCounts: StatusCounts;
  statusFilter: string;
  searchQuery: string;
  error: string | null;
  setStatusFilter: (status: string) => void;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  /** Moves the given orders to the Recently Deleted bin. */
  deleteOrders: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  /** Contents of the bin, newest removal first. */
  fetchDeletedOrders: () => Promise<Order[]>;
  /** Brings one order back out of the bin. */
  restoreOrder: (id: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Owns all server-side querying for the orders table: the full list fetch,
 * status filtering, debounced search, and per-status counts.
 *
 * The list is never paginated for the admin — every matching order comes back
 * in one pass. The API's 1000-row response cap is handled internally by
 * walking the result set in chunks, which is what previously forced older
 * orders onto a second page.
 */
export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusCounts, setStatusCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [error, setError] = useState<string | null>(null);

  // Monotonic id so an older in-flight list request can't overwrite a newer one.
  const requestIdRef = useRef(0);
  // Last effective search term applied, to avoid refetching spuriously
  // (e.g. on mount, or when a keystroke debounces to an unchanged value).
  const lastSearchRef = useRef('');

  // Debounce the search box, refetching only when the effective term actually
  // changes (so an unchanged keystroke doesn't re-pull the whole list).
  useEffect(() => {
    const trimmed = searchQuery.trim();
    const id = setTimeout(() => {
      if (lastSearchRef.current === trimmed) return;
      lastSearchRef.current = trimmed;
      setDebouncedSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const setStatusFilter = useCallback((status: string) => {
    setStatusFilterState(status);
  }, []);

  /** One chunk of the list query. A fresh builder is required per request
   *  because a PostgREST builder can only be awaited once. */
  const listChunkQuery = useCallback(
    (from: number) => {
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        // Recently Deleted orders are excluded in SQL, not filtered client-side.
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter);
      }

      const term = sanitizeSearch(debouncedSearch);
      if (term) {
        query = query.or(
          [
            `customer_name.ilike.%${term}%`,
            `customer_email.ilike.%${term}%`,
            `customer_phone.ilike.%${term}%`,
            `order_number.ilike.%${term}%`,
          ].join(','),
        );
      }

      return query.range(from, from + ORDERS_FETCH_CHUNK_SIZE - 1);
    },
    [statusFilter, debouncedSearch],
  );

  const loadOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const all: Order[] = [];
      let count = 0;

      // Keep pulling chunks until the server returns a short one. A short chunk
      // is the only reliable end-of-list signal: `count` can move under us if
      // orders arrive mid-walk.
      for (;;) {
        const { data, error: queryError, count: chunkCount } = await listChunkQuery(all.length);
        // A newer request superseded this one — drop the stale result.
        if (requestId !== requestIdRef.current) return;
        if (queryError) throw queryError;

        const rows = (data as Order[]) ?? [];
        all.push(...rows);
        count = chunkCount ?? all.length;

        if (rows.length < ORDERS_FETCH_CHUNK_SIZE) break;
      }

      setOrders(all);
      setTotalCount(count);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error loading orders:', err);
      setOrders([]);
      setTotalCount(0);
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [listChunkQuery]);

  const loadStatusCounts = useCallback(async () => {
    // head:true returns only the count (no rows), so each of these is a
    // near-zero-egress query regardless of table size.
    const headCount = async (status?: OrderStatus): Promise<number> => {
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      if (status) query = query.eq('order_status', status);
      const { count } = await query;
      return count ?? 0;
    };

    try {
      const [all, ...perStatus] = await Promise.all([
        headCount(),
        ...ORDER_STATUSES.map((status) => headCount(status)),
      ]);

      const next: StatusCounts = { ...EMPTY_COUNTS, all };
      ORDER_STATUSES.forEach((status, index) => {
        next[status] = perStatus[index];
      });
      setStatusCounts(next);
    } catch (err) {
      console.error('Error loading status counts:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  const refresh = useCallback(async () => {
    await Promise.all([loadOrders(), loadStatusCounts()]);
  }, [loadOrders, loadStatusCounts]);

  /**
   * Removal is an UPDATE, never a DELETE. Orders carry customer details and
   * payment proofs; losing them to a stray click is not recoverable any other
   * way. See utils/recycleBin.ts for the retention window.
   */
  const deleteOrders = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return { success: true };

      try {
        const { error: updateError } = await (supabase.from('orders') as any)
          .update({ deleted_at: new Date().toISOString() })
          .in('id', ids);

        if (updateError) throw updateError;

        await refresh();
        return { success: true };
      } catch (err) {
        console.error('Error deleting orders:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to delete orders.' };
      }
    },
    [refresh],
  );

  const fetchDeletedOrders = useCallback(async (): Promise<Order[]> => {
    try {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (queryError) throw queryError;
      return (data as Order[]) ?? [];
    } catch (err) {
      console.error('Error loading deleted orders:', err);
      return [];
    }
  }, []);

  const restoreOrder = useCallback(
    async (id: string) => {
      try {
        const { error: updateError } = await (supabase.from('orders') as any)
          .update({ deleted_at: null, deleted_by: null })
          .eq('id', id);

        if (updateError) throw updateError;

        await refresh();
        return { success: true };
      } catch (err) {
        console.error('Error restoring order:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to restore order.' };
      }
    },
    [refresh],
  );

  return {
    orders,
    loading,
    totalCount,
    statusCounts,
    statusFilter,
    searchQuery,
    error,
    setStatusFilter,
    setSearchQuery,
    refresh,
    deleteOrders,
    fetchDeletedOrders,
    restoreOrder,
  };
}
