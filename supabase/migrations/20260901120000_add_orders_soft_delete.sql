-- Recently Deleted bin for orders.
--
-- Orders were the last destructive path with no recovery: the admin panel could
-- clear every order in the system, customer details and payment proofs
-- included, with nothing to restore from. Removal is now an UPDATE that stamps
-- `deleted_at`, matching products and product_variations.
--
-- Additive only: the columns are nullable and every existing order stays live.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- The orders list and every status-count query read the live rows only.
CREATE INDEX IF NOT EXISTS orders_live_idx
  ON public.orders (created_at DESC)
  WHERE deleted_at IS NULL;

-- The bin reads the opposite side, newest removal first.
CREATE INDEX IF NOT EXISTS orders_recycle_bin_idx
  ON public.orders (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.orders.deleted_at IS
  'Soft delete stamp. NULL = live. Non-NULL = in the Recently Deleted bin, restorable for 30 days. See src/utils/recycleBin.ts.';
