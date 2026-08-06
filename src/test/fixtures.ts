import type { Product, ProductVariation, CartItem } from '../types';

export const mockVariation: ProductVariation = {
  id: 'var-1',
  product_id: 'prod-1',
  name: '5mg',
  quantity_mg: 5,
  price: 1500,
  discount_price: null,
  discount_active: false,
  stock_quantity: 10,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockVariationDiscounted: ProductVariation = {
  id: 'var-2',
  product_id: 'prod-1',
  name: '10mg',
  quantity_mg: 10,
  price: 2500,
  discount_price: 2000,
  discount_active: true,
  stock_quantity: 5,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockVariationOutOfStock: ProductVariation = {
  id: 'var-3',
  product_id: 'prod-1',
  name: '20mg',
  quantity_mg: 20,
  price: 4000,
  discount_price: null,
  discount_active: false,
  stock_quantity: 0,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockVariationSoldOutSmall: ProductVariation = {
  id: 'var-4',
  product_id: 'prod-5',
  name: '5mg',
  quantity_mg: 5,
  price: 1200,
  discount_price: null,
  discount_active: false,
  stock_quantity: 0,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockVariationSoldOutLarge: ProductVariation = {
  id: 'var-5',
  product_id: 'prod-5',
  name: '10mg',
  quantity_mg: 10,
  price: 2200,
  discount_price: null,
  discount_active: false,
  stock_quantity: 0,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockProduct: Product = {
  id: 'prod-1',
  name: 'BPC-157',
  description: 'Research-grade peptide for laboratory use',
  category: 'healing',
  base_price: 1500,
  discount_price: null,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: false,
  purity_percentage: 99,
  molecular_weight: '1419.53',
  cas_number: '137525-51-0',
  sequence: 'GEPPPGKPADDAGLV',
  storage_conditions: 'Store at -20°C',
  inclusions: ['Lyophilized peptide', 'COA included'],
  stock_quantity: 20,
  available: true,
  featured: true,
  image_url: null,
  safety_sheet_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  variations: [mockVariation, mockVariationDiscounted],
};

export const mockProductNoVariations: Product = {
  id: 'prod-2',
  name: 'TB-500',
  description: 'Thymosin Beta-4 fragment',
  category: 'healing',
  base_price: 2000,
  discount_price: 1800,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: true,
  purity_percentage: 98,
  molecular_weight: '4963.44',
  cas_number: '77591-33-4',
  sequence: null,
  storage_conditions: 'Store at -20°C',
  inclusions: null,
  stock_quantity: 15,
  available: true,
  featured: false,
  image_url: null,
  safety_sheet_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  variations: [],
};

export const mockProductOutOfStock: Product = {
  id: 'prod-3',
  name: 'GHK-Cu',
  description: 'Copper peptide',
  category: 'skin',
  base_price: 3000,
  discount_price: null,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: false,
  purity_percentage: 99,
  molecular_weight: '403.93',
  cas_number: '49557-75-7',
  sequence: null,
  storage_conditions: 'Store at 2-8°C',
  inclusions: null,
  stock_quantity: 0,
  available: true,
  featured: false,
  image_url: null,
  safety_sheet_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  variations: [],
};

export const mockProductUnavailable: Product = {
  ...mockProductOutOfStock,
  id: 'prod-4',
  name: 'Melanotan II',
  available: false,
  stock_quantity: 5,
};

// Every size is sold out. `stock_quantity` on the parent row is deliberately
// left positive: when a product has variations, the variations are the source
// of truth for sellable stock and the legacy parent column is often stale.
export const mockProductAllVariationsOutOfStock: Product = {
  ...mockProductOutOfStock,
  id: 'prod-5',
  name: 'Semaglutide',
  stock_quantity: 12,
  variations: [mockVariationSoldOutSmall, mockVariationSoldOutLarge],
};

export const mockCartItem: CartItem = {
  product: mockProduct,
  variation: mockVariation,
  quantity: 2,
};

export const mockCartItemNoVariation: CartItem = {
  product: mockProductNoVariations,
  quantity: 1,
};
