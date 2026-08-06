import { useState, useEffect } from 'react';
import type { CartItem, Product, ProductVariation } from '../types';
import { supabase } from '../lib/supabase';

// Checks cart items against the database and drops products that have been
// deleted, marked unavailable, or sold out (and items whose variation no longer
// exists or has run out). Stock is re-read live because the product snapshot
// stored in localStorage can be days old.
//
// Fails open: if a lookup errors we keep the cart as-is rather than emptying a
// shopper's basket over a transient outage. The admin order screen still blocks
// confirming an order with insufficient stock.
async function filterValidCartItems(items: CartItem[]): Promise<{ validItems: CartItem[]; removedNames: string[] }> {
  if (items.length === 0) {
    return { validItems: items, removedNames: [] };
  }

  const productIds = [...new Set(items.map(item => item.product.id))];
  const { data: products, error } = await supabase
    .from('products')
    .select('id, available, stock_quantity')
    .in('id', productIds);

  if (error) {
    console.error('Error validating cart products:', error);
    return { validItems: items, removedNames: [] };
  }

  const listedProductIds = new Set((products || []).filter(p => p.available).map(p => p.id));
  const sellableProductIds = new Set(
    (products || [])
      .filter(p => p.available && (p.stock_quantity ?? 0) > 0)
      .map(p => p.id)
  );

  const variationIds = items.filter(item => item.variation).map(item => item.variation!.id);
  // Variation id -> live stock. A variation missing from this map was deleted.
  let variationStock = new Map<string, number>();
  let variationLookupFailed = false;
  if (variationIds.length > 0) {
    const { data: variations, error: variationError } = await supabase
      .from('product_variations')
      .select('id, stock_quantity')
      .in('id', variationIds);

    if (variationError) {
      console.error('Error validating cart variations:', variationError);
      variationLookupFailed = true;
    } else {
      variationStock = new Map((variations || []).map(v => [v.id, v.stock_quantity ?? 0]));
    }
  }

  const validItems: CartItem[] = [];
  const removedNames: string[] = [];

  for (const item of items) {
    let isSellable: boolean;

    if (item.variation) {
      // A size was chosen, so that size's stock decides. The parent
      // `products.stock_quantity` column is stale for products with variations,
      // so the product only has to still be listed.
      isSellable = variationLookupFailed
        ? listedProductIds.has(item.product.id)
        : listedProductIds.has(item.product.id) &&
          (variationStock.get(item.variation.id) ?? 0) > 0;
    } else {
      isSellable = sellableProductIds.has(item.product.id);
    }

    if (isSellable) {
      validItems.push(item);
    } else {
      removedNames.push(`${item.product.name}${item.variation ? ` (${item.variation.name})` : ''}`);
    }
  }

  return { validItems, removedNames };
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount, then prune deleted/unavailable products
  useEffect(() => {
    const savedCart = localStorage.getItem('peptide_cart');
    if (!savedCart) return;

    let cancelled = false;
    try {
      const savedItems: CartItem[] = JSON.parse(savedCart);
      setCartItems(savedItems);

      filterValidCartItems(savedItems).then(({ validItems, removedNames }) => {
        if (!cancelled && removedNames.length > 0) {
          setCartItems(validItems);
        }
      });
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('peptide_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product, variation?: ProductVariation, quantity: number = 1) => {
    // Check stock availability
    const availableStock = variation ? variation.stock_quantity : product.stock_quantity;

    if (availableStock === 0) {
      alert(`Sorry, ${product.name}${variation ? ` ${variation.name}` : ''} is out of stock.`);
      return;
    }

    // Find existing item matching product and variation
    const existingItemIndex = cartItems.findIndex(
      item => item.product.id === product.id &&
        (variation ? item.variation?.id === variation.id : !item.variation)
    );

    if (existingItemIndex > -1) {
      // Update existing item - check if new total exceeds stock
      const currentQuantity = cartItems[existingItemIndex].quantity;
      const newQuantity = currentQuantity + quantity;

      if (newQuantity > availableStock) {
        const remainingStock = availableStock - currentQuantity;
        if (remainingStock > 0) {
          alert(`Only ${remainingStock} item(s) available in stock. Added ${remainingStock} to your cart.`);
          quantity = remainingStock;
        } else {
          alert(`Sorry, you already have the maximum available quantity (${currentQuantity}) in your cart.`);
          return;
        }
      }

      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setCartItems(updatedItems);
    } else {
      // Add new item - check if quantity exceeds stock
      if (quantity > availableStock) {
        alert(`Only ${availableStock} item(s) available in stock. Added ${availableStock} to your cart.`);
        quantity = availableStock;
      }

      const newItem: CartItem = {
        product,
        variation,
        quantity
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    // Check stock availability
    const item = cartItems[index];
    const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;

    if (quantity > availableStock) {
      alert(`Only ${availableStock} item(s) available in stock.`);
      quantity = availableStock;
    }

    const updatedItems = [...cartItems];
    updatedItems[index].quantity = quantity;
    setCartItems(updatedItems);
  };

  const removeFromCart = (index: number) => {
    const updatedItems = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedItems);
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('peptide_cart');
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const price = item.variation ? item.variation.price : (item.product.discount_active && item.product.discount_price ? item.product.discount_price : item.product.base_price);
      return total + (price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Re-checks the cart against the database, removes invalid items,
  // and returns the names of the items that were removed.
  const validateCart = async (): Promise<string[]> => {
    const { validItems, removedNames } = await filterValidCartItems(cartItems);
    if (removedNames.length > 0) {
      setCartItems(validItems);
    }
    return removedNames;
  };

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    validateCart
  };
}
