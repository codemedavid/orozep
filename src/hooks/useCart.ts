import { useState, useEffect } from 'react';
import type { CartItem, Product, ProductVariation } from '../types';
import { supabase } from '../lib/supabase';

// Checks cart items against the database and drops products that have been
// deleted or marked unavailable (and items whose variation no longer exists).
async function filterValidCartItems(items: CartItem[]): Promise<{ validItems: CartItem[]; removedNames: string[] }> {
  if (items.length === 0) {
    return { validItems: items, removedNames: [] };
  }

  const productIds = [...new Set(items.map(item => item.product.id))];
  const { data: products, error } = await supabase
    .from('products')
    .select('id, available')
    .in('id', productIds);

  if (error) {
    console.error('Error validating cart products:', error);
    return { validItems: items, removedNames: [] };
  }

  const availableProductIds = new Set((products || []).filter(p => p.available).map(p => p.id));

  const variationIds = items.filter(item => item.variation).map(item => item.variation!.id);
  let existingVariationIds = new Set<string>();
  if (variationIds.length > 0) {
    const { data: variations, error: variationError } = await supabase
      .from('product_variations')
      .select('id')
      .in('id', variationIds);

    if (variationError) {
      console.error('Error validating cart variations:', variationError);
      existingVariationIds = new Set(variationIds);
    } else {
      existingVariationIds = new Set((variations || []).map(v => v.id));
    }
  }

  const validItems: CartItem[] = [];
  const removedNames: string[] = [];

  for (const item of items) {
    const productValid = availableProductIds.has(item.product.id);
    const variationValid = !item.variation || existingVariationIds.has(item.variation.id);

    if (productValid && variationValid) {
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
