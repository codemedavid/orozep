import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Policy guard, not a behavioural test.
 *
 * `window.confirm` is dismissed by a single Enter keypress, which is how the
 * catalog was wiped. Destructive admin actions must route through
 * useConfirmDelete instead, so the operator has to retype what they target.
 *
 * ESLint would be the natural home for this rule, but `npm run lint` currently
 * throws repo-wide on an eslint/typescript-eslint version mismatch, so the
 * policy lives here where it actually runs.
 */
const MUST_NOT_USE_NATIVE_CONFIRM = [
  'AdminDashboard',
  'COAManager',
  'CategoryManager',
  'CourierManager',
  'FAQManager',
  'GuideManager',
  'PaymentMethodManager',
  'PeptideInventoryManager',
  'PromoCodeManager',
  'ProtocolManager',
  'RecycleBinManager',
  'ReviewsManager',
  'ShippingManager',
  'SiteSettingsManager',
  'VariationManager',
];

/**
 * Order status changes are routine daily workflow, not data loss. Typed
 * confirmation on routine actions trains an operator to type through prompts,
 * which destroys the signal on the actions that matter.
 */
const ALLOWED_NATIVE_CONFIRMS: Record<string, number> = {
  OrdersManager: 2,
};

function sourceOf(component: string): string {
  return readFileSync(resolve(__dirname, '..', `${component}.tsx`), 'utf8');
}

/** Counts real `confirm(...)` calls, ignoring our own `confirmDelete`. */
function countNativeConfirms(source: string): number {
  return (source.match(/(?<![A-Za-z])(?:window\.)?confirm\s*\(/g) ?? []).length;
}

describe('destructive admin actions do not use window.confirm', () => {
  it.each(MUST_NOT_USE_NATIVE_CONFIRM)('%s routes confirmation through the typed dialog', (component) => {
    expect(countNativeConfirms(sourceOf(component))).toBe(0);
  });

  it('only the order-status workflow actions keep a native confirm', () => {
    for (const [component, allowed] of Object.entries(ALLOWED_NATIVE_CONFIRMS)) {
      expect(countNativeConfirms(sourceOf(component))).toBe(allowed);
    }
  });
});
