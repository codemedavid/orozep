import React from 'react';
import { Activity, Tag } from 'lucide-react';
import type { CartItem } from '../../types';
import { formatPrice } from '../../utils/currency';
import { getLineTotal } from './pricing';

interface OrderSummaryProps {
    cartItems: CartItem[];
    subtotal: number;
    shippingFee: number;
    discountAmount: number;
    finalTotal: number;
    hasSelectedRegion: boolean;
    promoCode: string;
    onPromoCodeChange: (value: string) => void;
    onApplyPromo: () => void;
    onRemovePromo: () => void;
    isPromoApplied: boolean;
    isApplyingPromo: boolean;
    promoError: string;
    promoSuccess: string;
}

/**
 * Sticky running total for the single-page checkout. Every cost the customer
 * will be charged — items, shipping and discount — resolves here, so nothing
 * about the price is deferred to a later screen.
 */
const OrderSummary: React.FC<OrderSummaryProps> = ({
    cartItems,
    subtotal,
    shippingFee,
    discountAmount,
    finalTotal,
    hasSelectedRegion,
    promoCode,
    onPromoCodeChange,
    onApplyPromo,
    onRemovePromo,
    isPromoApplied,
    isApplyingPromo,
    promoError,
    promoSuccess,
}) => (
    <div className="bg-white rounded shadow-clinical p-6 sticky top-24 border border-gray-100">
        <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-2">
            Order Summary
            <Activity className="w-4 h-4 text-brand-600" />
        </h2>

        <div className="space-y-4 mb-6">
            {cartItems.map((item, index) => (
                <div key={index} className="pb-4 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                            <h3 className="font-bold text-charcoal-900 text-sm">{item.product.name}</h3>
                            {item.variation && (
                                <p className="text-xs text-gray-600 mt-0.5">{item.variation.name}</p>
                            )}
                        </div>
                        <span className="font-bold text-charcoal-900 text-sm">
                            {formatPrice(getLineTotal(item))}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                </div>
            ))}
        </div>

        {/* Promo Code */}
        <div className="mb-6 pt-2">
            <p className="text-xs font-bold text-brand-700 uppercase mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Promo Code
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => onPromoCodeChange(e.target.value)}
                    placeholder="ENTER CODE"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none uppercase"
                    disabled={isPromoApplied || isApplyingPromo}
                />
                {isPromoApplied ? (
                    <button
                        type="button"
                        onClick={onRemovePromo}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded text-xs font-bold border border-red-100 hover:bg-red-100 shrink-0 whitespace-nowrap"
                    >
                        REMOVE
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onApplyPromo}
                        disabled={!promoCode || isApplyingPromo}
                        className="px-3 py-2 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 disabled:opacity-50 shrink-0 whitespace-nowrap"
                    >
                        APPLY
                    </button>
                )}
            </div>
            {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
            {promoSuccess && <p className="text-emerald-600 text-xs mt-1 font-medium">{promoSuccess}</p>}
        </div>

        <div className="space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-4">
            <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                    {hasSelectedRegion ? (
                        formatPrice(shippingFee)
                    ) : (
                        <span className="text-gray-400 italic text-xs">Select a region</span>
                    )}
                </span>
            </div>
            {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                </div>
            )}
            <div className="flex justify-between font-bold text-charcoal-900 text-lg pt-2 border-t border-gray-100 mt-2">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
            </div>
        </div>
    </div>
);

export default OrderSummary;
