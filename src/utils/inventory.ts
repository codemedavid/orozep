// Single source of truth for "can a shopper actually buy this right now?".
//
// Stock lives in two places: `products.stock_quantity` and, for products sold
// in several sizes, `product_variations.stock_quantity`. When a product has
// variation rows those rows are authoritative — the parent column is a legacy
// field that is frequently stale — so the parent count is only consulted for
// products that have no variations at all.

import type { Product, ProductVariation } from '../types';
import { isActive } from './recycleBin';

/** Coerces a stock column that may be null/undefined/negative into a count. */
function toStockCount(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** True when at least one unit of the product can be sold. */
export function hasSellableStock(product: Product): boolean {
  const variations: ProductVariation[] = product.variations ?? [];

  if (variations.length > 0) {
    return variations.some((variation) => toStockCount(variation.stock_quantity) > 0);
  }

  return toStockCount(product.stock_quantity) > 0;
}

/**
 * True when the product belongs on the customer-facing catalog: it is not in the
 * Recently Deleted bin, an operator has not delisted it, AND there is stock to
 * sell. Admin surfaces must not use this — they need sold-out and binned
 * products visible in order to restock or restore them.
 */
export function isVisibleOnStorefront(product: Product): boolean {
  return isActive(product) && product.available && hasSellableStock(product);
}

/** Returns a new array containing only the products a shopper can buy. */
export function filterStorefrontProducts(products: Product[]): Product[] {
  return products.filter(isVisibleOnStorefront);
}
