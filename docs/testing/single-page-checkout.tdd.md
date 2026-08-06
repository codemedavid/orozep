# Single-Page Checkout — TDD Evidence

## Source plan

No `*.plan.md` was used. Journeys were derived during this TDD run from the
request: *"can you make the order page just one page."*

**Scope interpretation:** "one page" means the *order form* is one page. The
post-submit "Order Confirmed" receipt remains its own screen, because it is a
result view rather than a step of the form. This was stated to the user before
implementation.

## User journeys

1. As a customer, I want to see my details, delivery and payment on one page,
   so that I do not have to pass a gate to find out what payment options exist.
2. As a customer, I want my shipping fee folded into the total as soon as I pick
   a region, so that the price is never deferred to a later screen.
3. As a customer, I want one clear submit button that tells me what is still
   missing, so that I am not guessing why I cannot order.
4. As a customer, I want a failed order to leave my filled-in form intact, so
   that I do not re-enter everything.

## Task report

### 1. Merge the details and payment steps into one page

Replaced the `step: 'details' | 'payment' | 'confirmation'` state machine with a
single `isConfirmed` boolean. Customer details, shipping address, courier,
shipping region, payment method, proof upload and notes now render as numbered
sections on one scrollable page. `Proceed to Payment` and `Back to Details` are
gone; `handleProceedToPayment` was deleted.

- Command: `npx vitest run src/components/__tests__/Checkout.test.tsx`
- RED: `Tests 11 failed | 2 passed (13)` — payment sections were not in the DOM
  on first render. The 2 passing tests (`Back to Cart`, order summary contents)
  cover behavior the change intentionally preserves.
- GREEN: `Tests 13 passed (13)`

### 2. Gate the single submit on both details and payment proof

With two steps, details validity gated navigation and proof gated submission.
On one page a single `canPlaceOrder = isDetailsValid && !!paymentProof &&
!isUploadingProof` gates the one `Complete Order` button, plus a
`missingRequirementMessage` naming what is outstanding.

- Guarantee: the button cannot be enabled by satisfying only one of the two
  requirements — covered by three separate tests (details-only, proof-only,
  both).

### 3. Resolve shipping into the total on the same page

The old details sidebar showed a "Total Estimate" with the note "+ Shipping fee
added at payment". Since region is now selected on the same page, `OrderSummary`
shows Subtotal / Shipping / Discount / Total with the real total, and prompts
"Select a region" until one is chosen.

- Verified by asserting `₱4,950` (₱4,800 subtotal + ₱150 shipping) appears
  without any navigation.

### 4. Keep the file under the size limit

`Checkout.tsx` was 1082 lines, over the 800-line maximum, and the merge would
have grown it. Extracted three modules; `Checkout.tsx` is now 743 lines.

| File | Lines | Responsibility |
|---|---|---|
| `src/components/Checkout.tsx` | 743 | Single-page form, order submission |
| `src/components/checkout/OrderConfirmation.tsx` | 199 | Post-order receipt, auto-copy, messaging links |
| `src/components/checkout/OrderSummary.tsx` | 136 | Sticky totals + promo code |
| `src/components/checkout/pricing.ts` | 29 | `getUnitPrice` / `getLineTotal` |

`pricing.ts` replaces three copies of the same discount-resolution block
(order-items payload, WhatsApp message, and each of the two sidebars).

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Customer, shipping, courier and payment sections all render together on first paint | `Checkout.test.tsx:renders customer, shipping and payment sections together on one page` | component | PASS |
| 2 | No step-navigation controls exist anywhere in the form | `Checkout.test.tsx:does not render multi-step navigation controls` | component | PASS |
| 3 | Exactly one submit button is offered | `Checkout.test.tsx:shows a single Complete Order button as the only submit action` | component | PASS |
| 4 | Uploading proof alone does not enable submission | `Checkout.test.tsx:disables Complete Order when customer details are incomplete` | component | PASS |
| 5 | Filling details alone does not enable submission | `Checkout.test.tsx:disables Complete Order when payment proof is missing` | component | PASS |
| 6 | Both requirements together enable submission | `Checkout.test.tsx:enables Complete Order once details and payment proof are provided` | component | PASS |
| 7 | Shipping fee is in the total on the same page, no navigation | `Checkout.test.tsx:includes the shipping fee in the order total on the same page` | component | PASS |
| 8 | A full order submits the correct row and reaches the confirmation | `Checkout.test.tsx:places the order from the single page and shows the confirmation` | component | PASS |
| 9 | A failed DB insert alerts and leaves the form intact | `Checkout.test.tsx:shows an error and stays on the page when the order insert fails` | component | PASS |
| 10 | A failed proof upload alerts and does not confirm the order | `Checkout.test.tsx:shows an error and stays on the page when the proof upload fails` | component | PASS |
| 11 | Back to Cart still returns to the cart | `Checkout.test.tsx:returns to the cart when Back to Cart is clicked` | component | PASS |
| 12 | The summary lists every cart item | `Checkout.test.tsx:displays the order summary with cart items` | component | PASS |
| 13 | The first payment method is preselected with no navigation | `Checkout.test.tsx:preselects the first payment method without any step navigation` | component | PASS |

## Coverage and known gaps

- `npx vitest run src/components/__tests__/Checkout.test.tsx` → **13 passed (13)**
- `npm run build` → `✓ built in 4.88s`
- `npx tsc --noEmit -p tsconfig.app.json` → Checkout errors went 19 → 18. All
  remaining are pre-existing `Property ... does not exist on type 'never'`
  errors from untyped Supabase queries, plus an unused `setContactMethod`. The
  three new `checkout/*` files produce zero type errors.

### Known gaps

- **Pre-existing suite failures, out of scope.** Full suite went from
  `18 failed | 97 passed` to `9 failed | 106 passed`. The 9 remaining failures
  are in `MenuItemCard.test.tsx` (7) and `App.integration.test.tsx` (2), neither
  of which this change touches. They were failing before this work started.
- **No visual regression or a11y run.** The web testing rules ask for
  screenshots at 320/768/1024/1440 and an automated a11y pass; this repo has no
  Playwright or axe setup, so the single page has not been checked for overflow
  on narrow viewports. Worth adding before this ships.
- **`contactMethod` is now dead state.** It is written into the `orders` row but
  no UI sets it, and `setContactMethod` is unused. This predates the change and
  was left alone rather than silently widening scope.

## Merge evidence

| Stage | Commit | Evidence |
|---|---|---|
| RED | `1b8647d test: add single-page checkout spec (RED)` | `11 failed \| 2 passed` |
| GREEN | `ac3a6a6 feat: collapse the checkout into a single page` | `13 passed`, build OK |

Both commits are on `main` and reachable from `HEAD`. No separate refactor
commit: the extraction of `OrderConfirmation`, `OrderSummary` and `pricing.ts`
was required to land the change under the 800-line file limit, so it is part of
the GREEN commit and covered by the same passing tests.
