import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Menu from '../Menu';
import {
  mockProduct,
  mockProductNoVariations,
  mockProductOutOfStock,
  mockProductAllVariationsOutOfStock,
} from '../../test/fixtures';
import type { Product } from '../../types';

function renderMenu(menuItems: Product[]) {
  return render(
    <Menu
      menuItems={menuItems}
      addToCart={vi.fn()}
      cartItems={[]}
      updateQuantity={vi.fn()}
    />
  );
}

describe('Menu — storefront stock visibility', () => {
  it('hides a product whose inventory has dropped to zero', () => {
    renderMenu([mockProduct, mockProductOutOfStock]);

    expect(screen.getByText('BPC-157')).toBeInTheDocument();
    expect(screen.queryByText('GHK-Cu')).not.toBeInTheDocument();
  });

  it('hides a product once every one of its sizes is sold out', () => {
    renderMenu([mockProduct, mockProductAllVariationsOutOfStock]);

    expect(screen.getByText('BPC-157')).toBeInTheDocument();
    expect(screen.queryByText('Semaglutide')).not.toBeInTheDocument();
  });

  it('keeps showing in-stock products', () => {
    renderMenu([mockProduct, mockProductNoVariations, mockProductOutOfStock]);

    expect(screen.getByText('BPC-157')).toBeInTheDocument();
    expect(screen.getByText('TB-500')).toBeInTheDocument();
  });

  it('excludes sold-out products from the visible product count', () => {
    renderMenu([mockProduct, mockProductOutOfStock, mockProductAllVariationsOutOfStock]);

    // Only BPC-157 is buyable, so the catalog must not advertise 3 products.
    expect(screen.getByText('1 product')).toBeInTheDocument();
    expect(screen.queryByText('3 products')).not.toBeInTheDocument();
  });

  it('shows the empty state when the entire catalog is sold out', () => {
    renderMenu([mockProductOutOfStock, mockProductAllVariationsOutOfStock]);

    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(screen.getByText('No products available right now.')).toBeInTheDocument();
  });
});
