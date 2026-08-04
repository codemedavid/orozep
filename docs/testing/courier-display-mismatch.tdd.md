# TDD Evidence — Wrong courier shown on storefront order tracking

**Branch:** `fix/courier-display-mismatch`
**Source plan:** none. Journeys were derived during this TDD run from a reported defect on order `ORZ-13941`.
**Reported by:** shop admin — "the admin set it as jnt but in the storefront its lbc ... admin said she already deleted the lbc courier since they dont use lbc"

## User journeys

1. As a customer, I want the order tracking page to name the courier that is actually carrying my parcel, so that I do not go to the wrong courier's website.
2. As a customer, when the shop cannot identify the courier for my order, I want to still see my tracking number without being sent to a courier that is not carrying my parcel.
3. As the shop admin, I want the courier shown in the order form to be the courier that gets saved, so that I do not silently record a courier I never chose.
4. As the shop admin, when I delete a courier we no longer use, I want it gone from the order form and from the storefront.

## Root cause

Two defects, one of which was actively corrupting data.

**A. Admin form wrote a courier the admin never picked (`OrdersManager.tsx:691,697`).**
The courier `<select>` state defaulted to `'lbc'` when an order had no `shipping_provider`. Once LBC was deleted from the `couriers` table there was no `<option value="lbc">`, and a `<select>` whose value matches no option renders the *first* option while keeping the unmatched value in state. The admin saw "J&T Express", entered a tracking number, saved — and `'lbc'` was written to the order.

**B. Storefront named couriers from a hardcoded map (`OrderTracking.tsx:217-269`).**
Courier names and tracking URLs came from a ternary chain (`'lbc'`/`'lalamove'`/`'maxim'`/`'spx'`, else J&T), not from the `couriers` table. So a stored `'lbc'` rendered "LBC Express" plus a live `lbcexpress.com` link for a courier the shop deleted, and any newly-added courier would have been mislabelled "J&T Express".

Production state at time of fix (`couriers` table contained only `jnt` / J&T Express):

| `shipping_provider` | orders | with tracking |
|---|---|---|
| `jnt` | 1316 | 1316 |
| *(null)* | 120 | 0 |
| `lbc` | 85 | 81 |
| `maxim` | 1 | 1 |

The 85 `lbc` orders span 2026-07-16 → 2026-08-03 (76 of them created in Aug 2026), interleaved with 1196 `jnt` orders in the same period — consistent with defect A rather than genuine LBC shipments.

## Task report

| Task | Summary | Validation command | Result |
|---|---|---|---|
| Reproduce | Wrote 15 unit + 6 storefront + 4 admin tests against the defective behaviour | `npx vitest run src/lib/__tests__/couriers.test.ts src/components/__tests__/OrderTracking.test.tsx src/components/__tests__/OrdersManager.test.tsx` | **RED** — 7 failed \| 6 passed (13) |
| Fix | Added `src/lib/couriers.ts`; rewired storefront + admin form; removed the hardcoded courier fallback | same command | **GREEN** — 28 passed (28) |
| Regression check | Compared full suite against pre-change baseline | `npm test` on HEAD vs `0654c85` in a baseline worktree | 18 failures, **identical at baseline** — pre-existing, unrelated |
| Build | Production build | `npm run build` | ✓ built in 2.44s |

RED evidence (excerpts):

```
Error: Failed to resolve import "../couriers" from "src/lib/__tests__/couriers.test.ts". Does the file exist?
FAIL  OrderTracking > does not link to a deleted courier tracking site
  AssertionError: expected [ <a …(4)>…(1)</a> ] to have a length of +0 but got 1
FAIL  OrdersManager > defaults an order with no courier to a courier that actually exists
  TestingLibraryElementError: Unable to find a label with the text of: /courier/i
```

GREEN evidence:

```
 Test Files  3 passed (3)
      Tests  28 passed (28)
```

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | An order with no courier never defaults to a hardcoded courier | `couriers.test.ts:never falls back to a hardcoded courier…` | unit | PASS |
| 2 | A stored code missing from the courier list is replaced, so displayed == saved | `couriers.test.ts:replaces a stored code that no longer exists…` | unit | PASS |
| 3 | A valid stored courier is preserved | `couriers.test.ts:keeps a stored code that still matches an active courier` | unit | PASS |
| 4 | Inactive couriers are never auto-selected | `couriers.test.ts:ignores inactive couriers when resolving` | unit | PASS |
| 5 | No courier is invented when the list is empty or still loading | `couriers.test.ts:returns an empty selection when no active courier is available` | unit | PASS |
| 6 | The default courier follows `sort_order`, not array position | `couriers.test.ts:picks the first courier by sort order…` | unit | PASS |
| 7 | Courier names come from the couriers table | `couriers.test.ts:names the courier from the courier list` | unit | PASS |
| 8 | Tracking URLs are built from the courier's own template, URL-encoded | `couriers.test.ts:builds the tracking URL…`, `…encodes the tracking number…` | unit | PASS |
| 9 | A deleted courier is never named or linked to | `couriers.test.ts:does not claim a deleted courier shipped the order`, `…offers no tracking link for a courier it cannot identify` | unit | PASS |
| 10 | A deactivated courier still names historical orders | `couriers.test.ts:still names a deactivated courier…` | unit | PASS |
| 11 | No link is offered without a template or a tracking number | `couriers.test.ts:offers no tracking link when…` (×2) | unit | PASS |
| 12 | A missing provider is treated as unknown, not guessed | `couriers.test.ts:treats a missing provider as unknown rather than guessing` | unit | PASS |
| 13 | The storefront names the courier from the table and links to its tracking URL | `OrderTracking.test.tsx:names the courier…`, `…links to the tracking URL…` | component | PASS |
| 14 | The storefront never shows "LBC" for a deleted courier (ORZ-13941) | `OrderTracking.test.tsx:does not show a deleted courier the shop no longer uses` | component | PASS |
| 15 | The storefront never links to `lbcexpress.com` for an unknown courier | `OrderTracking.test.tsx:does not link to a deleted courier tracking site` | component | PASS |
| 16 | An unknown courier is not mislabelled as J&T Express by the fallback | `OrderTracking.test.tsx:does not mislabel an unknown courier as J&T Express` | component | PASS |
| 17 | The tracking number still shows for couriers with no tracking site | `OrderTracking.test.tsx:still shows the tracking number…` | component | PASS |
| 18 | The admin form defaults to a courier that exists, and displayed == saved | `OrdersManager.test.tsx:defaults an order with no courier…`, `…replaces a stored courier that no longer exists…` | component | PASS |
| 19 | A deleted courier is not offered in the admin form | `OrdersManager.test.tsx:does not offer a courier the admin deleted` | component | PASS |
| 20 | With no couriers available the admin must choose explicitly | `OrdersManager.test.tsx:forces an explicit choice…` | component | PASS |

## Coverage and known gaps

- **No coverage number recorded.** `npx vitest run --coverage` fails with `Cannot find dependency '@vitest/coverage-v8'`; the dependency was not installed, as that was outside the scope of this fix. By inspection, the 15 unit tests exercise every branch of `src/lib/couriers.ts` (both branches of `resolveCourierCode`, all three branches of `getCourierDisplay`/`buildTrackingUrl`).
- **18 pre-existing suite failures remain** in `App.integration.test.tsx`, `Checkout.test.tsx` and `MenuItemCard.test.tsx`. Verified identical at `0654c85` in a baseline worktree — untouched by this change, and not fixed here.
- **Pre-existing `tsc` errors remain** across `App.tsx`, `AdminDashboard.tsx` and other files; not introduced by this change and not addressed.
- **Data backfill NOT applied.** The 85 `lbc` orders and 1 `maxim` order still carry codes for deleted couriers. Post-fix these render as "Tracking Number" with no courier name and no link — accurate, but they do not yet say J&T. Correcting them requires an explicit decision from the shop owner about which historical orders were genuinely LBC; see "Open decision" below.

## Open decision

Backfilling `shipping_provider` for the 85 `lbc` orders (and 1 `maxim`) is a production data change affecting real customer-facing records and has not been performed. Options: backfill all 85 to `jnt`, backfill only the 76 created in Aug 2026, or leave the data and let the neutral display stand.
