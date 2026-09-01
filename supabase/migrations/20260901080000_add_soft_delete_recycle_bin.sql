-- Recently Deleted bin for products and variations.
--
-- Context: the catalog was wiped to zero twice with no audit trail and no
-- recoverable log evidence. Removals from the admin panel are now UPDATEs that
-- stamp `deleted_at`, so a wipe is always reversible. Nothing here destroys
-- data: the columns are nullable and every existing row stays live.
--
-- Follow-up (tracked separately): tighten the write grants held by the `anon`
-- role on these tables. That is only safe once this migration and the
-- application code that depends on it are both deployed.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- The storefront reads `... WHERE available AND deleted_at IS NULL` on every
-- page load. Partial indexes keep that on the live rows only.
CREATE INDEX IF NOT EXISTS products_live_idx
  ON public.products (featured DESC, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS product_variations_live_idx
  ON public.product_variations (product_id)
  WHERE deleted_at IS NULL;

-- The admin recycle bin reads the opposite side, newest removal first.
CREATE INDEX IF NOT EXISTS products_recycle_bin_idx
  ON public.products (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.products.deleted_at IS
  'Soft delete stamp. NULL = live. Non-NULL = in the Recently Deleted bin, restorable for 30 days. See src/utils/recycleBin.ts.';
COMMENT ON COLUMN public.product_variations.deleted_at IS
  'Soft delete stamp. NULL = live. See src/utils/recycleBin.ts.';
