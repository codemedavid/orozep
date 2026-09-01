# TDD Evidence: Recently Deleted bin for products

**Source plan**: inline plan from `/ecc:plan` (this session), Phase 2. No `*.plan.md` artifact was written.
**Branch**: `fix/recently-deleted-recovery`
**Complexity**: Medium

## Why this work exists

The Orozep catalog was reported as having "suddenly gone to 0" twice, with the two
admins certain neither of them removed anything. Investigation of the live
project found:

- Row Level Security is **off** on `products`, `product_variations`, `categories`,
  `orders`, `site_settings` and 7 other public tables, and `pg_policies` returns
  no policies for them.
- The `anon` role holds full write privileges on those tables.
- The `anon` key that unlocks them ships in the public JS bundle and is also
  hardcoded at `scripts/seed.js:5`.
- `scripts/seed.js:34` clears every product row before re-seeding demo data.
- Six migrations contain an unguarded full-table clear of `products`.
- `OrdersManager.tsx` exposes a "remove ALL orders" action behind `window.confirm`.
- There is no audit table, no `pgaudit`, and no logging trigger anywhere.

Postgres log retention had already lapsed, so **the cause cannot be attributed**.
That is the point of this change: removal stops being destructive, so the next
incident is recoverable regardless of who or what caused it.

A pre-work snapshot was captured with the new `scripts/backup_supabase.mjs`:
325 rows across 15 tables, written to a gitignored `backups/` directory.

## User journeys

| # | Journey |
|---|---|
| J1 | As an admin, when I remove a product it goes to a Recently Deleted bin instead of vanishing, so I can restore it if it was an accident or an attack |
| J2 | As a shopper, I never see a recently-removed product in the shop |
| J3 | As an admin, I can restore a product with its variations and stock intact |
| J4 | As an admin, the bin tells me how long I have left before an item is purged for good |

## Task report

### Task 1 — soft-delete predicates (`src/utils/recycleBin.ts`)

Pure module holding `isDeleted`, `isActive`, `partitionByDeletion`,
`daysUntilPurge`, `isPurgeable` and `RECYCLE_BIN_RETENTION_DAYS = 30`. Mirrors
the existing `src/utils/inventory.ts` pattern: pure, documented, single source of
truth, unit-tested.

Two deliberate safety asymmetries, both covered by tests:

- Any **non-blank** `deleted_at` hides the row, even one that will not parse as a
  date. Hiding a row we cannot date is safe; showing a binned product is not.
- A row whose stamp cannot be parsed is **never** purgeable. It is surfaced for a
  human instead of being destroyed automatically.

Validation: `npx vitest run src/utils/__tests__/recycleBin.test.ts`
RED: whole file failed — module did not exist (compile-time RED).
GREEN: 25 passed.

### Task 2 — storefront must not show binned products

`isVisibleOnStorefront` now requires `isActive(product)` in addition to
`available` and sellable stock. Admin surfaces intentionally do **not** use it —
they need binned and sold-out rows visible in order to restore or restock.

Validation: `npx vitest run src/utils/__tests__/inventory.test.ts`
RED excerpt:
```
AssertionError: expected [ 'prod-1', 'prod-6', 'prod-2' ] to deeply equal [ 'prod-1', 'prod-2' ]
```
GREEN: 19 passed.

### Task 3 — `useMenu` removes by UPDATE, and can restore

`deleteProduct` and `deleteVariation` now stamp `deleted_at` instead of clearing
the row. `restoreProduct` clears the stamp. `fetchDeletedProducts` reads the bin
newest-first. Reads filter `deleted_at IS NULL` in SQL for products; binned
variations are filtered while mapping, because a failed embedded PostgREST filter
would silently drop every variation and the join already has a fallback path.

Because no row is ever hard-removed, the cascade from `products` to
`product_variations` no longer fires — which is exactly what makes J3 work.

Validation: `npx vitest run src/hooks/__tests__/useMenu.softDelete.test.ts`
RED: 7 failed — hard removal issued; `restoreProduct` / `fetchDeletedProducts` absent.
GREEN: 7 passed.

### Task 4 — migration

`supabase/migrations/20260901080000_add_soft_delete_recycle_bin.sql` adds two
nullable columns to each table plus three partial indexes: two for the live-row
read path the storefront hits on every page load, one for the bin's newest-first
read.

Applied to the database and verified:
```
products_total 53 | products_live 53 | products_binned 0
variations_live 154 | new_columns 4 | new_indexes 3
```
Purely additive — no row was modified.

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | A non-blank `deleted_at` marks a row as binned; null, absent, empty and whitespace do not | `recycleBin.test.ts:isDeleted` | unit | PASS |
| 2 | `partitionByDeletion` splits rows without mutating the input | `recycleBin.test.ts:partitionByDeletion` | unit | PASS |
| 3 | The purge countdown starts at 30 days, counts down, and clamps at 0 | `recycleBin.test.ts:daysUntilPurge` | unit | PASS |
| 4 | A row is purgeable only after the full window; never while live, never when undateable | `recycleBin.test.ts:isPurgeable` | unit | PASS |
| 5 | A binned product is hidden from the storefront even with stock and `available: true` | `inventory.test.ts:soft-deleted products` | unit | PASS |
| 6 | A restored product returns to the storefront | `inventory.test.ts:soft-deleted products` | unit | PASS |
| 7 | Rows predating the migration (no `deleted_at`) still render | `inventory.test.ts:soft-deleted products` | unit | PASS |
| 8 | Removing a product never issues a hard row removal | `useMenu.softDelete.test.ts` | integration | PASS |
| 9 | Removing stamps a parseable `deleted_at` on the requested id only | `useMenu.softDelete.test.ts` | integration | PASS |
| 10 | Removing a variation is also soft, so restoring brings stock back | `useMenu.softDelete.test.ts` | integration | PASS |
| 11 | Restoring clears both `deleted_at` and `deleted_by` | `useMenu.softDelete.test.ts` | integration | PASS |
| 12 | The catalog query excludes binned rows in SQL, not in JS | `useMenu.softDelete.test.ts` | integration | PASS |

## Coverage

```
npx vitest run --coverage --coverage.include='src/utils/recycleBin.ts' \
  --coverage.include='src/utils/inventory.ts' \
  src/utils/__tests__/recycleBin.test.ts src/utils/__tests__/inventory.test.ts

Statements   : 100% ( 30/30 )
Branches     : 100% ( 24/24 )
Functions    : 100% ( 11/11 )
Lines        : 100% ( 27/27 )
```

`@vitest/coverage-v8` was added as a dev dependency; the repo had no coverage
provider installed before this change.

## Known gaps and pre-existing failures

Full suite after this work: **168 passed, 9 failed (177)**.

All 9 failures are pre-existing and unrelated. Verified by checking out `dab5395`
(the commit before any of this work) in a scratch worktree and running the same
two files, which fails the identical 9:

- `src/components/__tests__/MenuItemCard.test.tsx` — 7 failures (variation buttons,
  discount badge, add-to-cart, cart indicator)
- `src/__tests__/App.integration.test.tsx` — 2 failures (add to cart, cart nav)

One regression **was** introduced and fixed within this work: adding the
`.is('deleted_at', null)` filter broke 3 tests in the existing `useMenu.test.ts`
whose mock builder did not model `.is`. The test double was taught the new query
shape; all 7 pass.

Also pre-existing, not addressed here:

- `npm run lint` throws repo-wide on `api/generate-protocol.ts`
  (`TypeError: Cannot read properties of undefined (reading 'allowShortCircuit')`) —
  an eslint 9.36 / typescript-eslint version mismatch.
- `npx tsc --noEmit` reports 163 errors repo-wide, mostly from the untyped
  Supabase `Database` generic. `npm run build` is `vite build` alone and does not
  typecheck. Zero errors remain in the files authored here.

## Not yet done

The bin is now the storage layer, but there is **no admin UI for it yet**. An
operator can remove safely but cannot yet see or restore from the bin without a
direct query. That view, the typed-confirmation modal, the audit-log triggers,
and the `anon` write-grant lockdown are the remaining phases.

Until the write grants are tightened, the underlying exposure stands: anyone with
the public key can still write to these tables.

## Merge evidence

RED — `c448006` test: add reproducers for the Recently Deleted product bin
      (3 files failed, 9 tests failed, 20 passed)
GREEN — `6329f70` fix: send removed products to a Recently Deleted bin instead of
      destroying them (168 passed, 9 pre-existing failures)
REFACTOR — generic signatures on the recycleBin predicates so real rows and test
      literals both type-check; 51/51 still green, 0 tsc errors in new files.
