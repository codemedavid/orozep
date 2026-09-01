# TDD Evidence: typed confirmation before destructive admin actions

**Source plan**: inline plan from `/ecc:plan` (this session), Phase 4.
**Branch**: `fix/recently-deleted-recovery`
**Complexity**: Medium

## Why this work exists

Britt asked for "code before delete" after the catalog went to zero twice. Every
destructive action in the admin was guarded by `window.confirm`, which is
dismissed by a single Enter keypress — a guard that stops nothing.

Two specific defects found on the way:

- `OrdersManager.handleDeleteAllOrders` showed *"FINAL WARNING: This will delete
  every order in the system. Type confirm to proceed."* inside a `window.confirm`,
  **which has no text input**. The UI asked for something it could not accept.
- Product removal reported "deleted successfully" after the soft-delete work
  landed, when the product had actually moved to Recently Deleted.

A client-side PIN was considered and rejected. The admin password is already
hardcoded in the shipped bundle, so a PIN prompt stops no attacker and only slows
the operator. Retyping the item's name is what actually prevents the accident;
protection against the direct API path is the still-outstanding lockdown.

## User journeys

| # | Journey |
|---|---|
| J9 | As an admin, deleting something makes me type its name first, so I cannot do it by reflex |
| J10 | I can back out with Cancel or Escape and nothing happens |
| J11 | Reopening the prompt for a different product never arrives already armed |
| J12 | The prompt tells me whether the item is recoverable or gone for good |

## Task report

### Task 1 — `src/components/ConfirmDeleteDialog.tsx`

Accessible modal (`role="dialog"`, `aria-modal`, labelled by its title) whose
confirm control arms only when the typed text matches the item's name.

Matching is **trimmed and case-insensitive**, a deliberate call: the friction
that prevents an accident is having to read and retype the name. Demanding exact
capitalisation adds no safety and just makes an operator fight the box.

Validation: `npx vitest run src/components/__tests__/ConfirmDeleteDialog.test.tsx`
RED: `Failed to resolve import "../ConfirmDeleteDialog"` (compile-time RED).
GREEN: 14 passed.

One test was corrected rather than the implementation: the busy-state test
queried the button by the name `Delete`, but the control correctly reports
progress as `Deleting…` while in flight. The selector was wrong, not the
behaviour.

### Task 2 — `src/hooks/useConfirmDelete.ts`

Promise-based drop-in for `window.confirm`, so a call site changes from
`if (confirm(...))` to `if (await confirmDelete({ itemName }))` and the existing
body is untouched. This is what made converting six sites a one-line diff each
rather than a rewrite.

A superseded request resolves `false` rather than being left dangling, so an
awaiting caller can never hang.

Validation: `npx vitest run src/hooks/__tests__/useConfirmDelete.test.tsx`
RED: `Failed to resolve import "../useConfirmDelete"`.
GREEN: 6 passed.

### Task 3 — wiring the six destructive paths

| File | Actions converted |
|---|---|
| `PeptideInventoryManager.tsx` | delete product, delete size |
| `AdminDashboard.tsx` | delete product, bulk delete |
| `OrdersManager.tsx` | delete selected orders, delete ALL orders |

Order prompts state plainly that orders have **no** Recently Deleted bin and the
action cannot be undone, because that is still true. "Delete ALL orders" now
genuinely requires typing `DELETE ALL ORDERS`.

**A real bug was caught here by the tests.** The first wiring pass anchored on
each file's closing markup, which placed the dialog inside a *sub-component*
(`OrderDetailsView`, `InventoryItemCard`) where `confirmDialogProps` is out of
scope — a `ReferenceError` at runtime. `npm run build` passed anyway, because the
build is `vite build` with no typecheck. `OrdersManager.test.tsx` failed loudly;
`PeptideInventoryManager` had **no tests at all** and broke silently. That gap is
closed by Task 4.

### Task 4 — guard tests for `PeptideInventoryManager`

The screen Britt actually deletes from had zero test coverage. Five tests now
pin the whole chain: the inventory renders, the delete control opens a dialog
inside this component's tree, `deleteProduct` is not called until the name is
typed, Cancel leaves the product alone, and the prompt says the item is
recoverable.

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | Nothing renders while the dialog is closed | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 2 | The dialog names exactly what is being deleted | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 3 | Confirm stays disabled until the name is typed | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 4 | A partial name does not arm the control | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 5 | An exact match arms it | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 6 | Surrounding whitespace and casing are forgiven | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 7 | Confirming calls back exactly once | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 8 | Enter on a non-matching name does not confirm | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 9 | Cancel backs out without confirming | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 10 | Escape backs out without confirming | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 11 | Reopening for another item is never pre-armed | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 12 | A second confirm is blocked while one is in flight | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 13 | The dialog is an accessible modal with a name | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 14 | The confirmation input is labelled | `ConfirmDeleteDialog.test.tsx` | component | PASS |
| 15 | No dialog appears until something asks | `useConfirmDelete.test.tsx` | integration | PASS |
| 16 | Asking opens a dialog naming the item | `useConfirmDelete.test.tsx` | integration | PASS |
| 17 | Typing the name and confirming resolves true | `useConfirmDelete.test.tsx` | integration | PASS |
| 18 | Backing out resolves false | `useConfirmDelete.test.tsx` | integration | PASS |
| 19 | The dialog closes after either outcome | `useConfirmDelete.test.tsx` | integration | PASS |
| 20 | The hook is reusable after a cancellation | `useConfirmDelete.test.tsx` | integration | PASS |
| 21 | Inventory renders with its delete control | `PeptideInventoryManager.test.tsx` | integration | PASS |
| 22 | Deleting opens the typed prompt and does not delete yet | `PeptideInventoryManager.test.tsx` | integration | PASS |
| 23 | Deletion happens only after the name is typed | `PeptideInventoryManager.test.tsx` | integration | PASS |
| 24 | Backing out leaves the product alone | `PeptideInventoryManager.test.tsx` | integration | PASS |
| 25 | The prompt says the product is recoverable | `PeptideInventoryManager.test.tsx` | integration | PASS |

## Coverage

```
npx vitest run --coverage \
  --coverage.include='src/components/ConfirmDeleteDialog.tsx' \
  --coverage.include='src/hooks/useConfirmDelete.ts' \
  ConfirmDeleteDialog.test.tsx useConfirmDelete.test.tsx PeptideInventoryManager.test.tsx

Statements   : 100% ( 41/41 )
Branches     : 95%  ( 19/20 )
Functions    : 100% ( 14/14 )
Lines        : 100% ( 35/35 )
```

## Known gaps and pre-existing failures

Full suite: **206 passed, 9 failed (215)**. The 9 are the pre-existing
`MenuItemCard` (7) and `App.integration` (2) failures, verified at `dab5395`
before any of this work. `npm run build` succeeds. No tsc errors in any file
authored here.

### Task 5 — the remaining thirteen guards

A second pass converted every other destructive action: payment method, courier,
COA report, category, protocol, shipping location, review, article, product size,
FAQ, promo code, the homepage reset-to-defaults, and the bulk AI protocol
regeneration (which overwrites every protocol and spends API credits).

Handlers that only received an `id` now take the display name too, passed from
the call site that already had the object in hand. Untitled reviews fall back to
a typeable phrase.

**Two actions deliberately keep a native confirm**, and the policy guard
allowlists them: confirming and cancelling an order. Those are routine daily
workflow, not data loss. Typed confirmation on routine actions trains an
operator to type through prompts, which destroys the signal on the actions that
matter.

Prompts now state the truth per entity: products and sizes say they are
recoverable from Recently Deleted; everything else says it cannot be undone,
because it cannot.

`AdminDashboard` needed a second dialog instance in the protocols view — the
bulk-generate button lives there, while the existing instance only rendered in
the products view.

Validation, three layers because a source scan alone is not enough:

1. **Policy guard** (`no-native-confirm.test.ts`) — RED at 13 failed / 3 passed,
   GREEN at 16 passed.
2. **Type diff against baseline** — the earlier scope bug surfaces in tsc as
   `Cannot find name 'confirmDialogProps'`, so the conversion was checked with a
   stash-and-compare: 154 pre-existing errors before, 154 after, **0 new**. One
   genuinely new error was caught this way and fixed (`review.title` is
   `string | null`).
3. **Structural placement audit** — for all 13 sites, the delete control and the
   dialog sit inside the same `return (` block, so the confirmation promise can
   always be resolved rather than hanging on a dialog that never mounts.

### Task 6 — runtime proof of the converted pattern

`FAQManager.confirm.test.tsx` renders one converted manager and drives it: the
first click opens a dialog rather than deleting, the dialog names the FAQ's
question, deletion happens only after the question is typed, and cancelling
leaves it alone. The other eleven were wired identically and audited
structurally; this proves the pattern itself resolves at runtime.

## Not yet done

- ~~Orders still have no Recently Deleted bin~~ — done, see
  `orders-recycle-bin.tdd.md`. The prompts were updated to match.
- The `anon` write-grant lockdown is still outstanding. Typed confirmation
  prevents operator accidents; it does nothing about the public key.

## Merge evidence

RED — `?` test: add reproducers for the typed confirmation dialog
      (`Failed to resolve import "../ConfirmDeleteDialog"`)
GREEN — `4763750` feat: require typing an item's name before a destructive admin
      action (20/20 on the new files; 201 passed / 9 pre-existing; build OK)
REFACTOR — guard tests for PeptideInventoryManager, closing the gap that let a
      scope error ship silently; 206 passed / 9 pre-existing.
