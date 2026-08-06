# TDD Evidence — hide sold-out products from the storefront

## Source plan

No `*.plan.md` was supplied. Journeys were derived during this TDD run from the
request: *"can you automatically make the products not visible on the storefront
once the product have no stocks available in the inventory"*.

Two scope questions were put to the requester before any test was written, and
the answers below shaped the work:

1. **Partly sold-out sizes** — a product stays visible while any size has stock;
   sold-out sizes keep their existing greyed-out-but-visible treatment inside
   the product modal. (The alternative — removing sold-out sizes from the picker
   — was declined.)
2. **Stale carts** — cart revalidation was extended to drop sold-out items on
   load and at checkout, not just deleted/delisted ones.

## User journeys

1. As a shopper, I want the catalog to show only products I can actually buy, so
   I never open a product that has nothing in stock.
2. As a shopper browsing a multi-size peptide, I want the product to stay visible
   while at least one size is still in stock.
3. As an operator, I want a product to disappear from the storefront the moment
   inventory hits zero, without anyone remembering to untick "available".
4. As an admin, I want sold-out products to stay visible in the admin and
   inventory screens so I can restock them.
5. As a returning shopper, I want an item that sold out while it sat in my cart
   removed automatically, rather than failing later at order confirmation.

## Task report

### Task 1 — one source of truth for "is this sellable?"

Stock lived in two places (`products.stock_quantity` and
`product_variations.stock_quantity`) and the rule for combining them was
copy-pasted inline in `MenuItemCard.tsx` and `ProductDetailModal.tsx`. Extracted
it into `src/utils/inventory.ts` with variations authoritative whenever they
exist, because the parent column goes stale on multi-size products.

- **Command:** `npx vitest run src/utils/__tests__/inventory.test.ts`
- **RED:** ``Error: Failed to resolve import "../inventory" from
  "src/utils/__tests__/inventory.test.ts". Does the file exist?`` — compile-time
  RED; the suite could not collect because the module did not exist.
- **GREEN:** 16 passed.
- **Guaranteed:** a product counts as sellable only when a variation with stock
  exists, or (for products with no variations) the parent count is positive.
  Null, undefined and negative counts all read as sold out.

### Task 2 — sold-out products drop off the catalog

`Menu.tsx` now filters its incoming `menuItems` through
`filterStorefrontProducts` before search and sort, so the grid, the "N products"
counter and the empty state cannot disagree with each other.

- **Command:** `npx vitest run src/components/__tests__/Menu.test.tsx`
- **RED:** 4 failed / 1 passed. Sold-out products still rendered; the counter
  reported 3 products when only 1 was buyable; the empty state never appeared.
- **GREEN:** 5 passed.
- **Guaranteed:** a zero-stock product and an all-sizes-sold-out product are both
  absent from the catalog, in-stock products remain, the count reflects only
  visible products, and a fully sold-out catalog shows the empty state.

### Task 3 — carts drop items that sold out

`filterValidCartItems` in `useCart.ts` previously checked only `available` and
variation existence. It now re-reads live stock, because the product snapshot in
`localStorage` can be days old. It fails open on a lookup error so a transient
outage cannot empty someone's basket.

- **Command:** `npx vitest run src/hooks/__tests__/useCart.stock.test.ts`
- **RED:** 3 failed / 3 passed — `expected [] to deeply equal [ 'BPC-157 (10mg)' ]`,
  `expected [] to deeply equal [ 'TB-500' ]`, and a saved sold-out item surviving
  mount. The 3 already-green tests were the over-filtering guards.
- **GREEN:** 6 passed.
- **Guaranteed:** a sold-out item is pruned on cart load and reported by
  `validateCart`; a sold-out size is dropped while a sibling size in stock is
  kept; the stale parent `stock_quantity` is ignored when the item has a
  variation; a failed lookup leaves the cart intact.

### Task 4 — refactor (behaviour-preserving)

`MenuItemCard` and `ProductDetailModal` now call the shared helpers instead of
their own copies. `useCart`'s two revalidation queries got explicit row
interfaces so PostgREST's `never` inference stops erroring.

- **Command:** `npm test`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`
- **Result:** tests unchanged at 133 passed / 9 failed; tsc down to 154 errors
  from the 157 baseline (`useCart.ts` now clean); build succeeded in 2.98s.

## Test specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | A product with no variations and positive stock is sellable | `src/utils/__tests__/inventory.test.ts:hasSellableStock > returns true for a product without variations that still has stock` | unit | PASS | `npx vitest run src/utils/__tests__/inventory.test.ts` |
| 2 | A product with no variations and zero stock is not sellable | `inventory.test.ts:returns false for a product without variations whose stock hit zero` | unit | PASS | same |
| 3 | One in-stock size keeps the whole product sellable | `inventory.test.ts:returns true while at least one variation still has stock` | unit | PASS | same |
| 4 | All sizes sold out makes the product unsellable | `inventory.test.ts:returns false when every variation is sold out` | unit | PASS | same |
| 5 | A stale positive parent count cannot resurrect an all-sizes-sold-out product | `inventory.test.ts:ignores a stale positive stock_quantity on the parent row when variations exist` | unit | PASS | same |
| 6 | An empty or absent variations array falls back to the parent count | `inventory.test.ts:falls back to the parent stock_quantity when the variations array is empty` / `...when variations are undefined` | unit | PASS | same |
| 7 | Negative and missing stock counts read as sold out | `inventory.test.ts:treats a negative stock count as sold out` / `treats a missing stock count as sold out` | unit | PASS | same |
| 8 | A delisted product stays hidden even with stock on hand | `inventory.test.ts:hides a product that is in stock but manually marked unavailable` | unit | PASS | same |
| 9 | Filtering returns a new array and does not mutate the catalog | `inventory.test.ts:returns a new array and does not mutate the input` | unit | PASS | same |
| 10 | A zero-stock product is absent from the catalog | `src/components/__tests__/Menu.test.tsx:hides a product whose inventory has dropped to zero` | component | PASS | `npx vitest run src/components/__tests__/Menu.test.tsx` |
| 11 | An all-sizes-sold-out product is absent from the catalog | `Menu.test.tsx:hides a product once every one of its sizes is sold out` | component | PASS | same |
| 12 | In-stock products are still shown (no over-filtering) | `Menu.test.tsx:keeps showing in-stock products` | component | PASS | same |
| 13 | The "N products" counter excludes sold-out products | `Menu.test.tsx:excludes sold-out products from the visible product count` | component | PASS | same |
| 14 | A fully sold-out catalog shows the empty state, not a blank grid | `Menu.test.tsx:shows the empty state when the entire catalog is sold out` | component | PASS | same |
| 15 | A saved cart item whose product sold out is pruned on load | `src/hooks/__tests__/useCart.stock.test.ts:removes a saved cart item whose product stock has fallen to zero` | integration | PASS | `npx vitest run src/hooks/__tests__/useCart.stock.test.ts` |
| 16 | Saved items that still have stock survive load | `useCart.stock.test.ts:keeps every saved item when all of them still have stock` | integration | PASS | same |
| 17 | Checkout drops the sold-out size and reports it by name, keeping the in-stock sibling | `useCart.stock.test.ts:reports and removes the sold-out size while keeping the size still in stock` | integration | PASS | same |
| 18 | A stale parent stock column does not evict a cart item that chose an in-stock size | `useCart.stock.test.ts:ignores the parent stock column when the cart item has a variation` | integration | PASS | same |
| 19 | A sold-out no-variation product is reported by name at checkout | `useCart.stock.test.ts:reports a product with no variations that sold out` | integration | PASS | same |
| 20 | A failed stock lookup leaves the cart untouched (fails open) | `useCart.stock.test.ts:leaves the cart untouched when the stock lookup fails` | integration | PASS | same |

## Coverage and known gaps

**Coverage was not measured.** `npx vitest run --coverage.enabled
--coverage.provider=v8` fails with `MISSING DEPENDENCY Cannot find dependency
'@vitest/coverage-v8'` — the repo has no coverage tooling installed, and adding a
dev dependency was outside the requested scope. To enable it:

```
npm i -D @vitest/coverage-v8 && npx vitest run --coverage
```

The 27 tests added here cover every branch of `src/utils/inventory.ts` and both
sides of each new decision in `filterValidCartItems`.

Known gaps and deliberate exclusions:

- **9 pre-existing test failures remain**, unchanged by this work: 7 in
  `src/components/__tests__/MenuItemCard.test.tsx` and 2 in
  `src/__tests__/App.integration.test.tsx`. They assert against older markup
  (`5mg` / `10mg` variation buttons, a `View cart` label, a `View details`
  title) that the current components no longer render. Baseline before this
  branch was 106 passed / 9 failed; it is now 133 passed / 9 failed — the same
  9 tests, unrelated to stock visibility.
- **Filtering is client-side.** The Supabase query still returns sold-out rows
  and `Menu.tsx` drops them. Filtering in SQL would cut egress but needs a join
  condition over `product_variations`; not attempted here.
- **Sold-out sizes inside the product modal are unchanged** — visible and
  disabled, per the requester's explicit choice.
- **Admin surfaces are deliberately untouched.** `PeptideInventoryManager`,
  `AdminDashboard`, `ReviewsManager` and `VariationManager` still see every
  product, including sold-out ones, so they can be restocked.
- `src/components/Menu.tsx` still reports `TS6133: 'WHY_ITEMS' is declared but
  its value is never read` — pre-existing dead code, left alone.

## Merge evidence

Three checkpoint commits on `main`, in order:

| Commit | Stage | Evidence captured |
|--------|-------|-------------------|
| `e5346fd` | RED | `test: add reproducers for hiding sold-out products on the storefront` — 1 failed suite (unresolvable `../inventory` import) + 7 failed tests / 4 passed |
| `b68e22e` | GREEN | `fix: hide products from the storefront once they are out of stock` — 27 passed (3 files); full suite 133 passed / 9 pre-existing failures |
| `297aedd` | REFACTOR | `refactor: route storefront stock checks through the shared inventory module` — suite unchanged; tsc 157 → 154; `npm run build` succeeded |

If these are squashed, keep this table and the coverage gap above in the squash
commit body or PR description.
