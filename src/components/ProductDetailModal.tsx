import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, ShoppingCart, Plus, Minus, FlaskConical, Thermometer, Weight, Hash } from 'lucide-react';
import type { Product, ProductVariation } from '../types';
import { useReviews } from '../hooks/useReviews';
import { ikImage } from '../utils/imagekit';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variation: ProductVariation | undefined, quantity: number) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart }) => {
  const { getReviewsForProduct } = useReviews();
  const navigate = useNavigate();
  const [productReviews, setProductReviews] = useState<any[]>([]);

  useEffect(() => {
    if (product.id) {
      getReviewsForProduct(product.id).then(setProductReviews).catch(console.error);
    }
  }, [product.id]);

  const [imageError, setImageError] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | undefined>(
    product.variations?.find(v => v.stock_quantity > 0) ?? product.variations?.[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Slide in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 380);
  };

  // ── Price logic ──────────────────────────────────────────
  const currentPrice = selectedVariation
    ? (selectedVariation.discount_active && selectedVariation.discount_price != null
        ? selectedVariation.discount_price
        : selectedVariation.price)
    : (product.discount_active && product.discount_price != null
        ? product.discount_price
        : product.base_price);

  const originalPrice = selectedVariation ? selectedVariation.price : product.base_price;

  const hasDiscount = selectedVariation
    ? (selectedVariation.discount_active && selectedVariation.discount_price != null)
    : (product.discount_active && product.discount_price != null);

  const discountPct = hasDiscount ? Math.round((1 - currentPrice / originalPrice) * 100) : 0;

  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some(v => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  const selectedOos = selectedVariation ? selectedVariation.stock_quantity === 0 : false;
  const isAvailable = product.available && hasAnyStock && !selectedOos;

  const handleAddToCart = () => {
    if (!isAvailable) return;
    onAddToCart(product, selectedVariation, quantity);
    setAdded(true);
    setTimeout(() => {
      handleClose();
    }, 600);
  };

  const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 0 });

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-[380ms]"
        style={{
          background: 'rgba(20,10,22,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: visible ? 1 : 0,
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Sheet ────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
        aria-modal="true"
        role="dialog"
        aria-label={product.name}
      >
        <div
          className="pointer-events-auto w-full transition-transform duration-[380ms]"
          style={{
            maxWidth: '680px',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
            borderRadius: '28px 28px 0 0',
            background: '#FFF7FB',
            boxShadow: '0 -12px 60px rgba(91,40,40,0.18), 0 -2px 8px rgba(91,40,40,0.06)',
            maxHeight: '92dvh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drag handle */}
          <div className="flex-shrink-0 flex justify-center pt-3.5 pb-2">
            <div
              className="w-9 h-1"
              style={{ background: 'rgba(91,40,40,0.12)', borderRadius: '999px' }}
            />
          </div>

          {/* Scrollable body */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

            {/* ── Hero Image ─────────────────────────────── */}
            <div
              className="relative flex-shrink-0 overflow-hidden"
              style={{ height: '240px', background: '#FFEAF3' }}
            >
              {product.image_url && !imageError ? (
                <img
                  src={ikImage(product.image_url, { w: 800 })}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20" style={{ color: '#FCD3E5' }} />
                </div>
              )}

              {/* Gradient fade bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(255,251,253,0.95), transparent)' }}
              />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3.5 right-3.5 w-9 h-9 flex items-center justify-center transition-transform active:scale-90"
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: '50%',
                  boxShadow: '0 2px 12px rgba(91,40,40,0.14)',
                  border: '1px solid rgba(91,40,40,0.06)',
                }}
                aria-label="Close"
              >
                <X className="w-4 h-4" style={{ color: '#5B2828' }} />
              </button>

              {/* Badges */}
              <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5">
                {product.featured && (
                  <span
                    className="px-2.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full text-white"
                    style={{ background: '#E25C95', boxShadow: '0 2px 8px rgba(226,92,149,0.35)' }}
                  >
                    Featured
                  </span>
                )}
                {hasDiscount && (
                  <span
                    className="px-2.5 py-0.5 text-[10px] font-sans font-semibold rounded-full text-white"
                    style={{ background: '#E25C95', boxShadow: '0 2px 8px rgba(232,120,152,0.35)' }}
                  >
                    {discountPct}% off
                  </span>
                )}
                {!product.available && (
                  <span
                    className="px-2.5 py-0.5 text-[10px] font-sans font-semibold rounded-full uppercase tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.92)', color: '#B96A6A', border: '1px solid rgba(91,40,40,0.1)' }}
                  >
                    Unavailable
                  </span>
                )}
              </div>

              {/* Cart quantity badge if in cart */}
            </div>

            {/* ── Main Content ───────────────────────────── */}
            <div className="px-5 sm:px-6 pt-4 pb-10">

              {/* Name + Purity */}
              <div className="mb-4">
                <h2
                  className="font-heading font-semibold leading-tight mb-2"
                  style={{ fontSize: 'clamp(1.3rem, 5vw, 1.7rem)', color: '#5B2828' }}
                >
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {product.purity_percentage > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: '#E3F1FE', color: '#C73D7A', border: '1px solid rgba(226,92,149,0.2)' }}
                    >
                      <FlaskConical className="w-2.5 h-2.5" />
                      {product.purity_percentage}% Purity
                    </span>
                  )}
                  {product.cas_number && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-1 rounded-full"
                      style={{ background: '#FBF5F4', color: '#B96A6A', border: '1px solid rgba(91,40,40,0.08)' }}
                    >
                      CAS {product.cas_number}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Price ────────────────────────────────── */}
              <div
                className="flex items-center gap-3 mb-5 pb-5"
                style={{ borderBottom: '1px solid rgba(91,40,40,0.07)' }}
              >
                <span
                  className="font-heading font-semibold"
                  style={{ fontSize: 'clamp(1.6rem, 6vw, 2.1rem)', color: '#5B2828', lineHeight: 1 }}
                >
                  ₱{fmt(currentPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span
                      className="font-sans text-sm line-through"
                      style={{ color: '#D29797' }}
                    >
                      ₱{fmt(originalPrice)}
                    </span>
                    <span
                      className="font-sans text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#FFEAF3', color: '#E25C95', border: '1px solid rgba(232,120,152,0.2)' }}
                    >
                      Save {discountPct}%
                    </span>
                  </>
                )}
              </div>

              {/* ── Variations ───────────────────────────── */}
              {product.variations && product.variations.length > 0 && (
                <div className="mb-5">
                  <p
                    className="font-sans text-[11px] font-semibold uppercase tracking-widest mb-3"
                    style={{ color: '#B96A6A' }}
                  >
                    Select Format
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {product.variations.map(variation => {
                      const oos = variation.stock_quantity === 0;
                      const isSelected = selectedVariation?.id === variation.id;
                      const varHasDiscount = variation.discount_active && variation.discount_price != null;
                      const varPrice = varHasDiscount ? variation.discount_price! : variation.price;

                      return (
                        <button
                          key={variation.id}
                          onClick={() => !oos && setSelectedVariation(variation)}
                          disabled={oos}
                          className="relative p-3.5 text-left transition-all duration-150 active:scale-[0.98]"
                          style={{
                            borderRadius: '14px',
                            border: `1.5px solid ${isSelected && !oos ? '#E25C95' : oos ? 'rgba(91,40,40,0.07)' : 'rgba(91,40,40,0.1)'}`,
                            background: isSelected && !oos ? '#E3F1FE' : oos ? '#FBF5F4' : 'white',
                            cursor: oos ? 'not-allowed' : 'pointer',
                            boxShadow: isSelected && !oos ? '0 0 0 3px rgba(226,92,149,0.12)' : 'none',
                          }}
                        >
                          {/* Selected indicator */}
                          {isSelected && !oos && (
                            <span
                              className="absolute top-2.5 right-2.5 w-4 h-4 flex items-center justify-center rounded-full"
                              style={{ background: '#E25C95' }}
                            >
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}

                          <div
                            className="font-sans font-semibold text-sm mb-0.5 pr-5"
                            style={{ color: oos ? '#D29797' : isSelected ? '#C73D7A' : '#5B2828' }}
                          >
                            {variation.name}
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="font-sans text-xs font-medium"
                              style={{ color: oos ? '#D29797' : isSelected ? '#E25C95' : '#B96A6A' }}
                            >
                              ₱{fmt(varPrice)}
                            </span>
                            {varHasDiscount && (
                              <span
                                className="font-sans text-[10px] line-through"
                                style={{ color: '#E5C0C0' }}
                              >
                                ₱{fmt(variation.price)}
                              </span>
                            )}
                          </div>
                          {oos && (
                            <div
                              className="font-sans text-[10px] font-semibold mt-1"
                              style={{ color: '#E25C95' }}
                            >
                              Out of stock
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Quantity + Total ─────────────────────── */}
              <div
                className="flex items-center gap-4 mb-5 p-4 rounded-2xl"
                style={{ background: '#FBF5F4', border: '1px solid rgba(91,40,40,0.06)' }}
              >
                {/* Stepper */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                    style={{
                      background: 'white',
                      border: '1.5px solid rgba(91,40,40,0.1)',
                      color: quantity <= 1 ? '#E5C0C0' : '#7E3434',
                    }}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className="font-heading font-semibold text-xl min-w-[1.75rem] text-center"
                    style={{ color: '#5B2828' }}
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
                    style={{
                      background: 'white',
                      border: '1.5px solid rgba(91,40,40,0.1)',
                      color: '#7E3434',
                    }}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-px self-stretch" style={{ background: 'rgba(91,40,40,0.08)' }} />

                {/* Total */}
                <div className="flex-1">
                  <div className="font-sans text-[11px] uppercase tracking-wider mb-0.5" style={{ color: '#B96A6A' }}>
                    Total
                  </div>
                  <div
                    className="font-heading font-semibold"
                    style={{ fontSize: '1.25rem', color: '#5B2828', lineHeight: 1.1 }}
                  >
                    ₱{fmt(currentPrice * quantity)}
                  </div>
                </div>
              </div>

              {/* ── Add to Cart CTA ──────────────────────── */}
              <button
                onClick={handleAddToCart}
                disabled={!isAvailable}
                className="w-full flex items-center justify-center gap-2.5 font-sans font-semibold text-sm transition-all duration-200 active:scale-[0.98] mb-3"
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  ...(isAvailable
                    ? {
                        background: added
                          ? '#C73D7A'
                          : 'linear-gradient(135deg, #E25C95 0%, #D4509A 100%)',
                        color: 'white',
                        boxShadow: added
                          ? '0 4px 16px rgba(52,158,114,0.4)'
                          : '0 4px 20px rgba(226,92,149,0.38)',
                      }
                    : {
                        background: '#F4E4E4',
                        color: '#D29797',
                        cursor: 'not-allowed',
                      }),
                }}
              >
                {added ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3.5 9L7.5 13L14.5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    {!product.available
                      ? 'Unavailable'
                      : !hasAnyStock
                        ? 'Out of Stock'
                        : selectedOos
                          ? 'Variant Unavailable'
                          : `Add to Cart`}
                  </>
                )}
              </button>

              {/* Low stock nudge */}
              {isAvailable && (() => {
                const stockLeft = selectedVariation
                  ? selectedVariation.stock_quantity
                  : product.stock_quantity;
                return stockLeft > 0 && stockLeft <= 10 ? (
                  <p
                    className="text-center font-sans text-[11px] font-medium mb-4"
                    style={{ color: '#E25C95' }}
                  >
                    Only {stockLeft} left in stock — order soon
                  </p>
                ) : null;
              })()}

              {/* ── Description ──────────────────────────── */}
              <div
                className="pt-5 mt-2"
                style={{ borderTop: '1px solid rgba(91,40,40,0.07)' }}
              >
                <p
                  className="font-sans text-sm leading-relaxed"
                  style={{ color: '#9C4848' }}
                >
                  {product.description}
                </p>
              </div>

              {/* ── Kit Inclusions ───────────────────────── */}
              {product.inclusions && product.inclusions.length > 0 && (
                <div
                  className="mt-4 p-4 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #E3F1FE 0%, #FCD3E5 100%)',
                    border: '1px solid rgba(226,92,149,0.18)',
                  }}
                >
                  <p
                    className="font-sans text-[11px] font-semibold uppercase tracking-widest mb-3"
                    style={{ color: '#C73D7A' }}
                  >
                    Kit Inclusions
                  </p>
                  <ul className="space-y-2">
                    {product.inclusions.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 font-sans text-sm"
                        style={{ color: '#7E3434' }}
                      >
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5"
                          style={{ background: '#E25C95' }}
                        >
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Technical Details ─────────────────────── */}
              <div
                className="mt-4 rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(91,40,40,0.07)' }}
              >
                <div
                  className="px-4 py-3"
                  style={{ background: '#FBF5F4', borderBottom: '1px solid rgba(91,40,40,0.07)' }}
                >
                  <p
                    className="font-sans text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: '#B96A6A' }}
                  >
                    Technical Details
                  </p>
                </div>
                <div className="divide-y" style={{ background: 'white', '--tw-divide-opacity': 1 } as React.CSSProperties}>
                  {product.purity_percentage > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-2 font-sans text-xs" style={{ color: '#B96A6A' }}>
                        <FlaskConical className="w-3.5 h-3.5" />
                        Purity (HPLC)
                      </span>
                      <span className="font-sans text-xs font-semibold" style={{ color: '#C73D7A' }}>
                        {product.purity_percentage}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 font-sans text-xs" style={{ color: '#B96A6A' }}>
                      <Thermometer className="w-3.5 h-3.5" />
                      Storage
                    </span>
                    <span className="font-sans text-xs font-medium" style={{ color: '#7E3434' }}>
                      {product.storage_conditions}
                    </span>
                  </div>
                  {product.molecular_weight && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-2 font-sans text-xs" style={{ color: '#B96A6A' }}>
                        <Weight className="w-3.5 h-3.5" />
                        Molecular Weight
                      </span>
                      <span className="font-sans text-xs font-medium" style={{ color: '#7E3434' }}>
                        {product.molecular_weight}
                      </span>
                    </div>
                  )}
                  {product.cas_number && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-2 font-sans text-xs" style={{ color: '#B96A6A' }}>
                        <Hash className="w-3.5 h-3.5" />
                        CAS Number
                      </span>
                      <span className="font-sans text-xs font-medium" style={{ color: '#7E3434' }}>
                        {product.cas_number}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Customer Reviews ─────────────────────── */}
              {productReviews.length > 0 && (
                <div className="mt-4">
                  <p
                    className="font-sans text-[11px] font-semibold uppercase tracking-widest mb-3 px-1"
                    style={{ color: '#B96A6A' }}
                  >
                    Customer Reviews
                  </p>
                  <div className="space-y-3">
                    {productReviews.slice(0, 3).map((review) => (
                      <div
                        key={review.id}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          background: '#FBF5F4',
                          border: '1px solid rgba(91,40,40,0.07)',
                        }}
                      >
                        {review.image_url && (
                          <img
                            src={ikImage(review.image_url, { w: 600 })}
                            alt={review.title || 'Review'}
                            className="w-full object-cover"
                            style={{ maxHeight: '320px', minHeight: '180px' }}
                            loading="lazy"
                          />
                        )}
                        {(review.title || review.content) && (
                          <div className="px-3 py-2.5">
                            {review.title && (
                              <p
                                className="text-xs font-semibold"
                                style={{ color: '#5B2828' }}
                              >
                                {review.title}
                              </p>
                            )}
                            {review.content && (
                              <p
                                className="text-xs mt-0.5 line-clamp-3"
                                style={{ color: '#9C4848' }}
                              >
                                {review.content}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/reviews');
                    }}
                    className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: '#FFEAF3',
                      color: '#E25C95',
                    }}
                  >
                    See All Reviews
                  </button>
                </div>
              )}

              {/* Bottom safe area spacer */}
              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailModal;
