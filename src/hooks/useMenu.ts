import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductVariation } from '../types';

// Product columns fetched for the storefront.
const PRODUCT_COLUMNS =
  'id, name, description, category, base_price, discount_price, discount_start_date, discount_end_date, discount_active, purity_percentage, molecular_weight, cas_number, sequence, storage_conditions, inclusions, stock_quantity, available, featured, image_url, safety_sheet_url, created_at, updated_at';

// Variations are embedded via a PostgREST join (`product_variations(*)`) so the
// whole catalog loads in ONE request instead of 1 + N (one query per product).
// This is the main Supabase egress saver — see useMenu.test.ts.
const PRODUCT_SELECT = `${PRODUCT_COLUMNS}, product_variations(*)`;

// Short-lived per-tab cache so quick re-mounts (route changes, remounts) reuse
// the last fetch instead of re-hitting Supabase. It is process-local: a mutation
// clears the cache only in the tab that made it, so other clients keep seeing
// the previous data until the TTL lapses. The storefront tolerates that; the
// admin panel bypasses the cache entirely (see below) so operators never edit
// stale data.
const MENU_CACHE_TTL_MS = 60_000;
let menuCache: { data: Product[]; at: number } | null = null;

function isMenuCacheFresh(): boolean {
  return menuCache !== null && Date.now() - menuCache.at < MENU_CACHE_TTL_MS;
}

function invalidateMenuCache(): void {
  menuCache = null;
}

interface UseMenuOptions {
  /**
   * Open a realtime subscription + refetch on window focus/visibility.
   * Off by default: the customer-facing storefront fetches once and does not
   * hold a websocket open per visitor. Enable it in the admin panel so product
   * managers still see live updates while editing.
   */
  realtime?: boolean;
}

export function useMenu(options: UseMenuOptions = {}) {
  const { realtime = false } = options;
  // Storefront may hydrate from the shared cache; admin starts clean and fetches
  // fresh so operators never see stale data.
  const [products, setProducts] = useState<Product[]>(() =>
    !realtime && isMenuCacheFresh() && menuCache ? menuCache.data : []
  );
  const [loading, setLoading] = useState(realtime || !isMenuCacheFresh());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Storefront reuses a fresh cache; admin always fetches fresh.
    if (!realtime && isMenuCacheFresh() && menuCache) {
      setProducts(menuCache.data);
      setLoading(false);
    } else {
      fetchProducts();
    }

    // Storefront: no realtime subscription.
    if (!realtime) {
      return;
    }

    // Admin only: keep the catalog live while managing products.
    const channelId = `products-realtime-${Date.now()}`;
    const productsChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('✅ Product changed:', payload);
          fetchProducts(); // Refetch all products when any change occurs
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_variations'
        },
        (payload) => {
          console.log('✅ Variation changed:', payload);
          fetchProducts(); // Refetch all products when variations change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, [realtime]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Single query: products with their variations embedded via a PostgREST
      // join. Replaces the previous 1 + N pattern (one extra query per product)
      // to minimize Supabase egress. Cast to `any` because the generated
      // Database type does not declare the products→product_variations relation.
      const { data, error } = await (supabase.from('products') as any)
        .select(PRODUCT_SELECT)
        .eq('available', true)
        .order('featured', { ascending: false })
        .order('name', { ascending: true })
        .order('quantity_mg', { referencedTable: 'product_variations', ascending: true });

      let rows = data;
      if (error) {
        // Resilience: if the embedded join fails (missing/ambiguous FK, RLS on
        // product_variations, a stale schema cache, etc.), degrade to a
        // products-only fetch so the catalog still renders instead of going
        // blank. Variations come back empty until the relation is reachable.
        console.error('Embedded product query failed; falling back to products-only:', error);
        const fallback = await supabase
          .from('products')
          .select(PRODUCT_COLUMNS)
          .eq('available', true)
          .order('featured', { ascending: false })
          .order('name', { ascending: true });
        if (fallback.error) throw fallback.error;
        rows = fallback.data;
      }

      const mapped: Product[] = ((rows as Record<string, unknown>[]) || []).map((row) => {
        const { product_variations, ...product } = row;
        return {
          ...(product as Omit<Product, 'variations'>),
          variations: (product_variations ?? []) as ProductVariation[],
        };
      });

      menuCache = { data: mapped, at: Date.now() };
      setProducts(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Ensure image_url is explicitly included
      const productData: any = {
        ...product,
        image_url: product.image_url !== undefined ? product.image_url : null,
      };

      console.log('📤 Adding product to database:', { name: productData.name, image_url: productData.image_url });
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select('*, image_url') // Explicitly include image_url in response
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Product added to database:', { id: data?.id, image_url: data?.image_url });

      if (data) {
        invalidateMenuCache();
        setProducts(prev => [...prev, { ...data, variations: [] }]);
      }
      return { success: true, data };
    } catch (err) {
      console.error('❌ Error adding product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add product' };
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      // Ensure image_url is explicitly included in the update payload
      // Handle both null, undefined, and empty string cases
      let imageUrlValue: string | null = null;
      if (updates.image_url !== undefined && updates.image_url !== null) {
        const urlString = String(updates.image_url).trim();
        imageUrlValue = urlString === '' ? null : urlString;
      }

      // Create update payload with explicit image_url
      const updatePayload: any = {
        ...updates,
        image_url: imageUrlValue, // Always explicitly set image_url
      };

      // Force image_url to be included even if it was somehow excluded
      updatePayload.image_url = imageUrlValue;

      console.log('📤 Updating product in database:', {
        id,
        image_url: updatePayload.image_url,
        image_url_type: typeof updatePayload.image_url,
        image_url_length: updatePayload.image_url?.length || 0,
        payload_keys: Object.keys(updatePayload),
        fullPayload: updatePayload
      });

      // Explicitly select image_url to ensure it's returned
      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select('*, image_url') // Explicitly include image_url in response
        .single();

      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error hint:', error.hint);

        // Provide more helpful error message
        let errorMessage = error.message || 'Unknown error';
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          errorMessage = 'Permission denied. Check Row Level Security (RLS) policies for the products table.';
        } else if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          errorMessage = 'Database column error. Make sure image_url column exists in products table.';
        }

        throw new Error(errorMessage);
      }

      console.log('✅ Product updated in database:', {
        id,
        image_url: data?.image_url,
        image_url_type: typeof data?.image_url,
        image_url_length: data?.image_url?.length || 0,
        fullData: data
      });

      // Verify the image_url was actually saved
      if (updatePayload.image_url && data?.image_url !== updatePayload.image_url) {
        console.warn('⚠️ WARNING: image_url mismatch!', {
          sent: updatePayload.image_url,
          sent_type: typeof updatePayload.image_url,
          received: data?.image_url,
          received_type: typeof data?.image_url
        });
      } else if (updatePayload.image_url && data?.image_url === updatePayload.image_url) {
        console.log('✅ Image URL verified - matches what was sent');
      }

      if (data) {
        // Update local state immediately
        invalidateMenuCache();
        setProducts(prev => prev.map(p => p.id === id ? { ...data, variations: p.variations } : p));
      }
      return { success: true, data };
    } catch (err) {
      console.error('❌ Error updating product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      return { success: false, error: errorMessage };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      invalidateMenuCache();
      setProducts(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete product' };
    }
  };

  const addVariation = async (variation: Omit<ProductVariation, 'id' | 'created_at'>) => {
    try {
      // Only send columns that PostgREST schema cache recognizes
      // discount_price and discount_active are excluded due to stale schema cache (PGRST204)
      // They have DB defaults (null and false) so variations still work
      const insertData: Record<string, unknown> = {
        product_id: variation.product_id,
        name: variation.name,
        quantity_mg: variation.quantity_mg,
        price: variation.price,
        stock_quantity: variation.stock_quantity
      };

      console.log('📤 Adding variation:', insertData);

      const { data, error } = await supabase
        .from('product_variations')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase variation insert error:', error);
        console.error('❌ Error code:', error.code, 'Message:', error.message, 'Details:', error.details, 'Hint:', error.hint);
        throw new Error(error.message || 'Database error');
      }

      console.log('✅ Variation added:', data);

      // Refresh products to include new variation
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding variation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add variation' };
    }
  };

  const updateVariation = async (id: string, updates: Partial<ProductVariation>) => {
    try {
      // Only send columns that PostgREST schema cache recognizes
      // discount_price and discount_active are excluded due to stale schema cache (PGRST204)
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.quantity_mg !== undefined) updateData.quantity_mg = updates.quantity_mg;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.stock_quantity !== undefined) updateData.stock_quantity = updates.stock_quantity;
      if (updates.product_id !== undefined) updateData.product_id = updates.product_id;

      const { data, error } = await supabase
        .from('product_variations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase variation update error:', error);
        throw new Error(error.message || 'Database error');
      }

      // Refresh products to include updated variation
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating variation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update variation' };
    }
  };

  const deleteVariation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_variations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh products to remove variation
      await fetchProducts();
      return { success: true };
    } catch (err) {
      console.error('Error deleting variation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete variation' };
    }
  };

  return {
    menuItems: products, // Keep the same name for backward compatibility
    products,
    loading,
    error,
    refreshProducts: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addVariation,
    updateVariation,
    deleteVariation
  };
}
