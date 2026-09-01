import { describe, it, expect } from 'vitest';
import type { Product } from '../../types';
import {
  hasSellableStock,
  isVisibleOnStorefront,
  filterStorefrontProducts,
} from '../inventory';
import {
  mockProduct,
  mockProductNoVariations,
  mockProductOutOfStock,
  mockProductUnavailable,
  mockProductAllVariationsOutOfStock,
  mockVariation,
  mockVariationOutOfStock,
  mockProductDeleted,
} from '../../test/fixtures';

describe('hasSellableStock', () => {
  it('returns true for a product without variations that still has stock', () => {
    // Arrange: TB-500, no variations, stock_quantity 15
    // Act
    const result = hasSellableStock(mockProductNoVariations);
    // Assert
    expect(result).toBe(true);
  });

  it('returns false for a product without variations whose stock hit zero', () => {
    expect(hasSellableStock(mockProductOutOfStock)).toBe(false);
  });

  it('returns true while at least one variation still has stock', () => {
    const partiallySoldOut: Product = {
      ...mockProduct,
      variations: [mockVariationOutOfStock, mockVariation],
    };

    expect(hasSellableStock(partiallySoldOut)).toBe(true);
  });

  it('returns false when every variation is sold out', () => {
    expect(hasSellableStock(mockProductAllVariationsOutOfStock)).toBe(false);
  });

  it('ignores a stale positive stock_quantity on the parent row when variations exist', () => {
    // The parent row claims 12 units but all variations are at 0. Variations win.
    expect(mockProductAllVariationsOutOfStock.stock_quantity).toBeGreaterThan(0);
    expect(hasSellableStock(mockProductAllVariationsOutOfStock)).toBe(false);
  });

  it('falls back to the parent stock_quantity when the variations array is empty', () => {
    const noVariationRows: Product = { ...mockProduct, variations: [] };

    expect(hasSellableStock(noVariationRows)).toBe(true);
  });

  it('falls back to the parent stock_quantity when variations are undefined', () => {
    const { variations: _dropped, ...withoutVariations } = mockProduct;

    expect(hasSellableStock(withoutVariations as Product)).toBe(true);
  });

  it('treats a negative stock count as sold out', () => {
    const negativeStock: Product = {
      ...mockProductNoVariations,
      stock_quantity: -3,
    };

    expect(hasSellableStock(negativeStock)).toBe(false);
  });

  it('treats a missing stock count as sold out', () => {
    const missingStock = {
      ...mockProductNoVariations,
      stock_quantity: undefined,
    } as unknown as Product;

    expect(hasSellableStock(missingStock)).toBe(false);
  });
});

describe('isVisibleOnStorefront', () => {
  it('shows a product that is available and in stock', () => {
    expect(isVisibleOnStorefront(mockProduct)).toBe(true);
  });

  it('hides a product that is available but sold out', () => {
    expect(isVisibleOnStorefront(mockProductOutOfStock)).toBe(false);
  });

  it('hides a product that is in stock but manually marked unavailable', () => {
    // mockProductUnavailable has stock 5 but available: false
    expect(mockProductUnavailable.stock_quantity).toBeGreaterThan(0);
    expect(isVisibleOnStorefront(mockProductUnavailable)).toBe(false);
  });
});

describe('filterStorefrontProducts', () => {
  it('keeps only the products a shopper can actually buy', () => {
    const catalog = [
      mockProduct,
      mockProductNoVariations,
      mockProductOutOfStock,
      mockProductUnavailable,
      mockProductAllVariationsOutOfStock,
    ];

    const visible = filterStorefrontProducts(catalog);

    expect(visible.map((p) => p.id)).toEqual(['prod-1', 'prod-2']);
  });

  it('returns a new array and does not mutate the input', () => {
    const catalog = [mockProduct, mockProductOutOfStock];

    const visible = filterStorefrontProducts(catalog);

    expect(visible).not.toBe(catalog);
    expect(catalog).toHaveLength(2);
  });

  it('returns an empty list when the whole catalog is sold out', () => {
    expect(
      filterStorefrontProducts([mockProductOutOfStock, mockProductAllVariationsOutOfStock])
    ).toEqual([]);
  });

  it('handles an empty catalog without throwing', () => {
    expect(filterStorefrontProducts([])).toEqual([]);
  });
});

describe('isVisibleOnStorefront — soft-deleted products', () => {
  it('hides a product that is sitting in the Recently Deleted bin', () => {
    // Arrange: prod-6 is available with stock, but has a deleted_at timestamp.
    expect(mockProductDeleted.available).toBe(true);
    expect(mockProductDeleted.stock_quantity).toBeGreaterThan(0);

    // Act
    const result = isVisibleOnStorefront(mockProductDeleted);

    // Assert
    expect(result).toBe(false);
  });

  it('shows the product again once it is restored from the bin', () => {
    const restored: Product = { ...mockProductDeleted, deleted_at: null, deleted_by: null };

    expect(isVisibleOnStorefront(restored)).toBe(true);
  });

  it('still shows products from before the soft-delete migration (no deleted_at column)', () => {
    // Rows fetched by an older client have no deleted_at at all; they are live.
    const { deleted_at: _a, deleted_by: _b, ...legacyRow } = mockProductDeleted;

    expect(isVisibleOnStorefront(legacyRow as Product)).toBe(true);
  });

  it('drops soft-deleted products from the storefront catalog', () => {
    const catalog = [mockProduct, mockProductDeleted, mockProductNoVariations];

    const visible = filterStorefrontProducts(catalog);

    expect(visible.map((p) => p.id)).toEqual(['prod-1', 'prod-2']);
  });
});
