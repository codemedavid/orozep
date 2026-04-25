import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock useMenu to provide test data
vi.mock('../hooks/useMenu', () => ({
  useMenu: () => ({
    menuItems: [
      {
        id: 'prod-1',
        name: 'BPC-157',
        description: 'Research-grade peptide',
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
        inclusions: ['Lyophilized peptide'],
        stock_quantity: 20,
        available: true,
        featured: true,
        image_url: null,
        safety_sheet_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        variations: [
          {
            id: 'var-1',
            product_id: 'prod-1',
            name: '5mg',
            quantity_mg: 5,
            price: 1500,
            discount_price: null,
            discount_active: false,
            stock_quantity: 10,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
    ],
    loading: false,
    refreshProducts: vi.fn(),
  }),
}));

// Mock useCategories
vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'healing', name: 'Healing', icon: '💊', sort_order: 1, active: true, created_at: '', updated_at: '' },
    ],
    loading: false,
  }),
}));

// Mock useSiteSettings
vi.mock('../hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    settings: {
      site_name: 'Orozep PH',
      site_logo: '',
      site_description: 'Premium peptides',
      currency: '₱',
      currency_code: 'PHP',
    },
    loading: false,
  }),
}));

describe('App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn();
  });

  it('renders the main page with products', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('BPC-157')).toBeInTheDocument();
    });
  });

  it('shows Add to Cart button for available products', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });
  });

  it('can add product to cart and see cart count update', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('BPC-157')).toBeInTheDocument();
    });

    // Click Add to Cart
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    // Floating cart button should appear with count
    await waitFor(() => {
      expect(screen.getByLabelText('View cart')).toBeInTheDocument();
    });
  });

  it('navigates to cart view when cart button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('BPC-157')).toBeInTheDocument();
    });

    // Add to cart first
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    // Click floating cart button
    await waitFor(async () => {
      const cartButton = screen.getByLabelText('View cart');
      await user.click(cartButton);
    });

    // Should show cart view - either empty cart or shopping cart text
    await waitFor(() => {
      expect(screen.getByText(/Shopping Cart|Your cart is empty/)).toBeInTheDocument();
    });
  });
});
