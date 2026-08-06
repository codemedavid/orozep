import type { CartItem } from '../../types';

/**
 * Resolve the price a single unit of a cart item is actually charged at,
 * preferring an active variation discount, then an active product discount,
 * and falling back to the base price.
 */
export function getUnitPrice(item: CartItem): number {
    const basePrice = item.variation ? item.variation.price : item.product.base_price;

    const isDiscounted = item.variation
        ? (item.variation.discount_active &&
            item.variation.discount_price !== null &&
            item.variation.discount_price < basePrice)
        : (item.product.discount_active &&
            item.product.discount_price !== null &&
            item.product.discount_price < item.product.base_price);

    if (!isDiscounted) {
        return basePrice;
    }

    return item.variation?.discount_price ?? item.product.discount_price ?? basePrice;
}

/** Total charged for a cart line, i.e. unit price times quantity. */
export function getLineTotal(item: CartItem): number {
    return getUnitPrice(item) * item.quantity;
}
