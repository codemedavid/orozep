import React, { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import type { Product, ProductVariation } from '../types';
import { ikImage } from '../utils/imagekit';

interface MenuItemCardProps {
  product: Product;
  onAddToCart?: (product: Product, variation?: ProductVariation, quantity?: number) => void;
  cartQuantity?: number;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onProductClick?: (product: Product) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  product,
  onAddToCart,
  cartQuantity = 0,
  onProductClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const currentPrice = (product.discount_active && product.discount_price)
    ? product.discount_price
    : product.base_price;

  const hasDiscount = product.discount_active && product.discount_price !== null;
  const originalPrice = product.base_price;
  const discountPct = hasDiscount ? Math.round((1 - currentPrice / originalPrice) * 100) : 0;

  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some(v => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  const isAvailable = product.available && hasAnyStock;

  return (
    <div
      className="group h-full flex flex-col bg-white overflow-hidden transition-all duration-300 rounded-2xl cursor-pointer"
      style={{ border: '1px solid rgba(91,40,40,0.07)', boxShadow: '0 1px 4px rgba(91,40,40,0.04)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 40px rgba(245,160,190,0.16), 0 2px 8px rgba(91,40,40,0.06)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,160,190,0.40)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(91,40,40,0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(91,40,40,0.07)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* ── Image ── */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ height: '144px', background: '#FFF7FB' }}
        onClick={() => onProductClick?.(product)}
      >
        {product.image_url && !imageError ? (
          <img
            src={ikImage(product.image_url, { w: 400 })}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10" style={{ color: '#FCD3E5' }} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.featured && (
            <span
              className="px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full text-white"
              style={{ background: '#E25C95' }}
            >
              Featured
            </span>
          )}
          {hasDiscount && (
            <span
              className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded-full text-white"
              style={{ background: '#E25C95' }}
            >
              {discountPct}% off
            </span>
          )}
        </div>

        {/* Cart quantity dot */}
        {cartQuantity > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span
              className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-sans font-bold text-white"
              style={{ background: '#E25C95', boxShadow: '0 2px 8px rgba(226,92,149,0.4)' }}
            >
              {cartQuantity}
            </span>
          </div>
        )}

        {/* Out of stock */}
        {!isAvailable && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20"
            style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(2px)' }}
          >
            <span
              className="text-xs font-sans font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide"
              style={{ background: '#F4E4E4', color: '#B96A6A', border: '1px solid rgba(91,40,40,0.1)' }}
            >
              {!product.available ? 'Unavailable' : 'Out of Stock'}
            </span>
          </div>
        )}
      </div>

      {/* ── Details ── */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">

        {/* Name */}
        <h3
          className="font-heading font-semibold text-sm sm:text-base mb-1 line-clamp-2 leading-snug transition-colors"
          style={{ color: '#5B2828' }}
          onClick={() => onProductClick?.(product)}
          onMouseEnter={e => { (e.currentTarget as HTMLHeadingElement).style.color = '#E25C95'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLHeadingElement).style.color = '#5B2828'; }}
        >
          {product.name}
        </h3>

        {/* Description */}
        <p className="font-sans text-[11px] sm:text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#B96A6A' }}>
          {product.description}
        </p>

        {/* Purity */}
        {product.purity_percentage > 0 && (
          <div className="mb-3">
            <span
              className="inline-flex items-center text-[10px] font-sans font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: '#E3F1FE', color: '#C73D7A' }}
            >
              {product.purity_percentage}% Purity
            </span>
          </div>
        )}

        {/* Variations hint */}
        {product.variations && product.variations.length > 0 && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded-full"
              style={{ background: '#E3F1FE', color: '#E25C95', border: '1px solid rgba(226,92,149,0.18)' }}
            >
              {product.variations.length} option{product.variations.length > 1 ? 's' : ''} available
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(91,40,40,0.06)' }}>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="font-heading font-semibold text-base sm:text-lg" style={{ color: '#5B2828' }}>
              ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
            </span>
            {hasDiscount && (
              <span className="font-sans text-[11px] line-through" style={{ color: '#D29797' }}>
                ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </span>
            )}
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              if (!isAvailable) return;
              if (product.variations && product.variations.length > 0) {
                onProductClick?.(product);
                return;
              }
              onAddToCart?.(product, undefined, 1);
            }}
            disabled={!isAvailable}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs sm:text-sm font-sans font-medium transition-all duration-200"
            style={
              isAvailable
                ? { background: '#E25C95', color: 'white', boxShadow: '0 3px 14px rgba(226,92,149,0.28)' }
                : { background: '#F4E4E4', color: '#D29797', cursor: 'not-allowed' }
            }
            onMouseEnter={e => isAvailable && ((e.currentTarget as HTMLButtonElement).style.background = '#C73D7A')}
            onMouseLeave={e => isAvailable && ((e.currentTarget as HTMLButtonElement).style.background = '#E25C95')}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
