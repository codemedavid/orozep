import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Activity, Check, Upload, Lock, Truck } from 'lucide-react';
import type { CartItem } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useShippingLocations } from '../hooks/useShippingLocations';
import { useCouriers } from '../hooks/useCouriers';
import { supabase } from '../lib/supabase';
import { useImageUpload } from '../hooks/useImageUpload';
import { formatPrice } from '../utils/currency';
import { getUnitPrice, getLineTotal } from './checkout/pricing';
import OrderConfirmation from './checkout/OrderConfirmation';
import OrderSummary from './checkout/OrderSummary';

const stepBadgeClass =
    'flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-brand-50 text-brand-700 text-sm font-bold';

const fieldLabelClass = 'block text-xs font-bold text-brand-700 uppercase tracking-wide mb-2';

interface CheckoutProps {
    cartItems: CartItem[];
    totalPrice: number;
    onBack: () => void;
    validateCart: () => Promise<string[]>;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack, validateCart }) => {
    const { paymentMethods } = usePaymentMethods();
    const { locations: shippingLocations } = useShippingLocations();
    const { couriers } = useCouriers();
    const [isConfirmed, setIsConfirmed] = useState(false);

    // Customer Details
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Shipping Details
    const [address, setAddress] = useState('');
    const [barangay, setBarangay] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [selectedCourierId, setSelectedCourierId] = useState('');
    const [shippingLocation, setShippingLocation] = useState<string>('');

    // Payment
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [contactMethod, setContactMethod] = useState<'whatsapp' | 'viber'>('whatsapp');
    const [notes, setNotes] = useState('');

    const [orderMessage, setOrderMessage] = useState<string>('');
    const [orderNumber, setOrderNumber] = useState<string>('');

    // Payment Proof
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const { uploadImage, uploading: isUploadingProof } = useImageUpload('payment-proofs');

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [isConfirmed]);

    React.useEffect(() => {
        if (paymentMethods.length > 0 && !selectedPaymentMethod) {
            setSelectedPaymentMethod(paymentMethods[0].id);
        }
    }, [paymentMethods, selectedPaymentMethod]);

    // Calculate shipping fee based on location
    const selectedLocation = shippingLocations.find(loc => loc.id === shippingLocation);
    const shippingFee = selectedLocation ? selectedLocation.fee : 0;

    // Calculate final total (Subtotal + Shipping - Discount)
    const finalTotal = Math.max(0, totalPrice + shippingFee - discountAmount);

    // Rates offered for the chosen courier. Falls back to every active location
    // so the customer is never stranded when a courier has no matching rate.
    const availableShippingLocations = (() => {
        if (!selectedCourierId) return [];

        const courier = couriers.find(c => c.id === selectedCourierId);
        if (!courier) return [];

        const code = courier.code.toLowerCase();
        const matched = shippingLocations.filter(loc =>
            loc.id.toLowerCase().includes(code) || loc.name.toLowerCase().includes(code)
        );

        return matched.length > 0 ? matched : shippingLocations;
    })();

    // Handle Promo Code Application
    const handleApplyPromoCode = async () => {
        setPromoError('');
        setPromoSuccess('');
        setAppliedPromo(null);
        setDiscountAmount(0);

        const code = promoCode.trim().toUpperCase();
        if (!code) {
            setPromoError('Please enter a promo code');
            return;
        }

        setIsApplyingPromo(true);

        try {
            const { data: promo, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', code)
                .eq('active', true)
                .single();

            if (error || !promo) {
                setPromoError('Invalid or inactive promo code');
                setIsApplyingPromo(false);
                return;
            }

            // Check date validity
            const now = new Date();
            if (promo.start_date && new Date(promo.start_date) > now) {
                setPromoError('Promo code is not yet valid');
                setIsApplyingPromo(false);
                return;
            }
            if (promo.end_date && new Date(promo.end_date) < now) {
                setPromoError('Promo code has expired');
                setIsApplyingPromo(false);
                return;
            }

            // Check usage limits
            if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
                setPromoError('Promo code usage limit reached');
                setIsApplyingPromo(false);
                return;
            }

            // Check minimum purchase
            if (totalPrice < promo.min_purchase_amount) {
                setPromoError(`Minimum purchase of ₱${promo.min_purchase_amount} required`);
                setIsApplyingPromo(false);
                return;
            }

            // Calculate discount
            let discount = 0;
            if (promo.discount_type === 'percentage') {
                discount = (totalPrice * promo.discount_value) / 100;
                if (promo.max_discount_amount) {
                    discount = Math.min(discount, promo.max_discount_amount);
                }
            } else {
                discount = promo.discount_value;
            }

            discount = Math.min(discount, totalPrice);

            setDiscountAmount(discount);
            setAppliedPromo(promo);
            setPromoSuccess(`Promo code applied! You saved ₱${discount.toLocaleString()}`);
        } catch (err) {
            console.error('Error applying promo:', err);
            setPromoError('Failed to apply promo code');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const handleRemovePromoCode = () => {
        setAppliedPromo(null);
        setDiscountAmount(0);
        setPromoCode('');
        setPromoSuccess('');
        setPromoError('');
    };

    const isDetailsValid =
        fullName.trim() !== '' &&
        email.trim() !== '' &&
        phone.trim() !== '' &&
        address.trim() !== '' &&
        barangay.trim() !== '' &&
        city.trim() !== '' &&
        state.trim() !== '' &&
        zipCode.trim() !== '' &&
        selectedCourierId !== '' &&
        shippingLocation !== '';

    // Single-page checkout: the order can only be placed once the shipping
    // details are complete AND proof of payment has been attached.
    const canPlaceOrder = isDetailsValid && !!paymentProof && !isUploadingProof;

    const missingRequirementMessage = (() => {
        if (canPlaceOrder || isUploadingProof) return '';
        if (!isDetailsValid && !paymentProof) return 'Complete your details above and upload your payment proof to place this order.';
        if (!isDetailsValid) return 'Complete your details, courier and shipping region to place this order.';
        return 'Upload your proof of payment to place this order.';
    })();

    const handlePlaceOrder = async () => {
        if (!shippingLocation) {
            alert('Please select your shipping location.');
            return;
        }

        if (!paymentProof) {
            alert('Please upload a screenshot of your payment proof to proceed.');
            return;
        }

        const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);

        try {
            // 0. Make sure every cart item still exists and is available
            const removedItems = await validateCart();
            if (removedItems.length > 0) {
                alert(`Some items in your cart are no longer available and have been removed:\n\n• ${removedItems.join('\n• ')}\n\nPlease review your cart before placing the order.`);
                onBack();
                return;
            }

            // 1. Upload Payment Proof First
            let paymentProofUrl = null;
            if (paymentProof) {
                try {
                    paymentProofUrl = await uploadImage(paymentProof);
                } catch (uploadError: any) {
                    console.error('Failed to upload payment proof:', uploadError);
                    alert(`Failed to upload payment proof: ${uploadError.message}`);
                    return;
                }
            }

            const orderItems = cartItems.map(item => {
                const currentPrice = getUnitPrice(item);

                return {
                    product_id: item.product.id,
                    product_name: item.product.name,
                    variation_id: item.variation?.id || null,
                    variation_name: item.variation?.name || null,
                    quantity: item.quantity,
                    price: currentPrice,
                    total: currentPrice * item.quantity,
                    purity_percentage: item.product.purity_percentage
                };
            });

            // Save order to database; the DB trigger assigns a unique order_number
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    customer_name: fullName,
                    customer_email: email,
                    customer_phone: phone,
                    shipping_address: address,
                    shipping_barangay: barangay,
                    shipping_city: city,
                    shipping_state: state,
                    shipping_zip_code: zipCode,
                    order_items: orderItems,
                    total_price: Math.max(0, totalPrice - discountAmount), // Store subtotal minus discount (not including shipping)
                    shipping_fee: shippingFee,
                    courier_id: selectedCourierId || null,
                    shipping_location: shippingLocation,
                    payment_method_id: paymentMethod?.id || null,
                    payment_method_name: paymentMethod?.name || null,
                    payment_proof_url: paymentProofUrl,
                    contact_method: contactMethod || null,
                    notes: notes.trim() || null,
                    order_status: 'new',
                    payment_status: 'pending',
                    promo_code_id: appliedPromo?.id || null,
                    promo_code: appliedPromo?.code || null,
                    discount_applied: discountAmount
                }])
                .select()
                .single();

            if (orderError) {
                console.error('❌ Error saving order:', orderError);

                const errorMessage = orderError.message;
                console.error('Order error details:', { code: orderError.code, details: orderError.details, hint: orderError.hint });

                alert(`Failed to save order: ${errorMessage}\n\nPlease contact support if this issue persists.`);
                return;
            }

            // Update promo code usage count
            if (appliedPromo) {
                const { error: promoUpdateError } = await supabase
                    .from('promo_codes')
                    .update({ usage_count: appliedPromo.usage_count + 1 })
                    .eq('id', appliedPromo.id);

                if (promoUpdateError) {
                    console.error('Failed to update promo usage count:', promoUpdateError);
                }
            }

            console.log('✅ Order saved to database:', orderData);

            const customOrderNumber = orderData.order_number as string;
            setOrderNumber(customOrderNumber);

            // Get current date and time
            const now = new Date();
            const dateTimeStamp = now.toLocaleString('en-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            const orderDetails = `
✨ OROZEP PH - NEW ORDER

📅 ORDER DATE & TIME
${dateTimeStamp}

👤 CUSTOMER INFORMATION
Name: ${fullName}
Email: ${email}
Phone: ${phone}

📦 SHIPPING ADDRESS
${address}
${barangay}
${city}, ${state} ${zipCode}
Courier: ${couriers.find(c => c.id === selectedCourierId)?.name || 'N/A'}

🛒 ORDER DETAILS
${cartItems.map(item => {
                let line = `• ${item.product.name}`;
                if (item.variation) {
                    line += ` (${item.variation.name})`;
                }
                line += ` x${item.quantity} - ${formatPrice(getLineTotal(item))}`;
                if (item.product.purity_percentage && item.product.purity_percentage > 0) {
                    line += `\n  Purity: ${item.product.purity_percentage}%`;
                }
                return line;
            }).join('\n\n')}

💰 PRICING
Product Total: ₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
Shipping Fee: ₱${shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })} (${shippingLocation.replace('_', ' & ')})
${discountAmount > 0 ? `Discount (${appliedPromo?.code}): -₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}\n` : ''}Grand Total: ₱${finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}

💳 PAYMENT METHOD
${paymentMethod?.name || 'N/A'}
      ${paymentMethod ? `Account: ${paymentMethod.account_number}` : ''}

📸 PROOF OF PAYMENT
${paymentProofUrl ? 'Screenshot attached to order.' : 'Pending'}

📱 CONTACT METHOD
WhatsApp / Viber (+63 917 996 6191)

📋 ORDER NUMBER: ${customOrderNumber}

Please confirm this order. Thank you!
      `.trim();

            setOrderMessage(orderDetails);

            // Hand off to the confirmation screen, which auto-copies the summary
            // and opens the customer's messaging app.
            setIsConfirmed(true);
        } catch (error) {
            console.error('❌ Error placing order:', error);
            alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
        }
    };

    if (isConfirmed) {
        return <OrderConfirmation orderNumber={orderNumber} orderMessage={orderMessage} />;
    }

    return (
        <div className="min-h-screen bg-cool-gray py-6 md:py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-brand-600 font-medium mb-6 flex items-center gap-2 transition-colors group text-sm"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Cart</span>
                </button>

                <header className="mb-8">
                    <h1 className="font-heading text-2xl md:text-3xl font-bold text-charcoal-900 flex items-center gap-3">
                        Checkout
                        <Activity className="w-6 h-6 text-brand-600" />
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Everything happens on this page — fill in your details, pay, then place your order.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Information */}
                        <section className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-3">
                                <span className={stepBadgeClass}>1</span>
                                <span>Customer Details</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={fieldLabelClass}>Full Name *</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="input-field"
                                        placeholder="Juan Dela Cruz"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabelClass}>Facebook or WhatsApp Name *</label>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field"
                                        placeholder="e.g. Juan Dela Cruz"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabelClass}>Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="input-field"
                                        placeholder="09XX XXX XXXX"
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Shipping Address */}
                        <section className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-3">
                                <span className={stepBadgeClass}>2</span>
                                <span>Shipping Address</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className={fieldLabelClass}>Street Address *</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="input-field"
                                        placeholder="House/Unit, Street Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabelClass}>Barangay *</label>
                                    <input
                                        type="text"
                                        value={barangay}
                                        onChange={(e) => setBarangay(e.target.value)}
                                        className="input-field"
                                        placeholder="Brgy. Name"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={fieldLabelClass}>City *</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="input-field"
                                            placeholder="City"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={fieldLabelClass}>Province *</label>
                                        <input
                                            type="text"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className="input-field"
                                            placeholder="Province"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={fieldLabelClass}>ZIP/Postal Code *</label>
                                    <input
                                        type="text"
                                        value={zipCode}
                                        onChange={(e) => setZipCode(e.target.value)}
                                        className="input-field"
                                        placeholder="ZIP Code"
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Delivery: courier + region */}
                        <section className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-3">
                                <span className={stepBadgeClass}>3</span>
                                <span className="flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-brand-600" />
                                    Select Courier Provider *
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {couriers
                                    .filter(c => c.is_active)
                                    .map((courier) => (
                                        <button
                                            key={courier.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCourierId(courier.id);
                                                setShippingLocation(''); // Reset location when courier changes
                                            }}
                                            className={`p-4 rounded border transition-all text-left flex items-center gap-3 ${selectedCourierId === courier.id
                                                ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                                : 'border-gray-200 hover:border-brand-300'
                                                }`}
                                        >
                                            <div className="font-bold text-charcoal-900 text-sm">{courier.name}</div>
                                        </button>
                                    ))}
                            </div>

                            <div className={`mt-8 transition-opacity duration-300 ${!selectedCourierId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <h3 className="font-heading text-base font-bold text-charcoal-900 mb-3">
                                    Choose Shipping Region *
                                </h3>
                                <p className="text-xs text-gray-500 mb-4 bg-pink-50 p-3 rounded border border-pink-100">
                                    {selectedCourierId
                                        ? 'Select the rate applicable to your location.'
                                        : 'Please select a courier provider above first.'}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableShippingLocations.map((loc) => (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            onClick={() => setShippingLocation(loc.id)}
                                            className={`p-4 rounded border transition-all text-left ${shippingLocation === loc.id
                                                ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                                : 'border-gray-200 hover:border-brand-300'
                                                }`}
                                        >
                                            <p className="font-bold text-charcoal-900 text-sm mb-1">{loc.name || loc.id.replace('_', ' & ')}</p>
                                            <p className="text-xs text-brand-600 font-medium">{formatPrice(loc.fee)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Payment Method */}
                        <section className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-3">
                                <span className={stepBadgeClass}>4</span>
                                <span className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-brand-600" />
                                    Select Payment Method
                                </span>
                            </h2>
                            <div className="space-y-3">
                                {paymentMethods.map((method) => (
                                    <div key={method.id}>
                                        <label
                                            className={`block p-4 rounded border cursor-pointer transition-all ${selectedPaymentMethod === method.id
                                                ? 'border-brand-500 bg-brand-50/20 ring-1 ring-brand-500'
                                                : 'border-gray-200 hover:border-brand-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={method.id}
                                                    checked={selectedPaymentMethod === method.id}
                                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                    className="text-brand-600 focus:ring-brand-500"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-charcoal-900">{method.name}</p>
                                                    <p className="text-sm text-gray-600 font-mono mt-1">{method.account_number}</p>
                                                    {method.account_name && (
                                                        <p className="text-xs text-gray-500 mt-0.5">Account Name: {method.account_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </label>

                                        {/* Show QR Code if this method is selected and has a QR code */}
                                        {selectedPaymentMethod === method.id && method.qr_code_url && (
                                            <div className="mt-2 ml-8 mb-4 p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Scan to Pay</p>
                                                <div className="flex justify-center">
                                                    <img
                                                        src={method.qr_code_url}
                                                        alt={`${method.name} QR Code`}
                                                        className="max-w-[200px] w-full h-auto rounded-lg border border-gray-200"
                                                    />
                                                </div>
                                                <p className="text-xs text-center text-gray-400 mt-2">
                                                    Screenshot your payment and upload it below
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Payment Proof Upload */}
                        <section className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-3">
                                <span className={stepBadgeClass}>5</span>
                                <span className="flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-brand-600" />
                                    Upload Proof of Payment
                                </span>
                            </h2>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors bg-gray-50/50">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setPaymentProof(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                    id="payment-proof-upload"
                                />
                                <label htmlFor="payment-proof-upload" className="cursor-pointer flex flex-col items-center">
                                    {paymentProof ? (
                                        <>
                                            <Check className="w-12 h-12 text-emerald-600 mb-3" />
                                            <p className="font-medium text-charcoal-900">{paymentProof.name}</p>
                                            <p className="text-sm text-gray-500 mt-1">Click to change file</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                            <p className="font-medium text-charcoal-900">Click to upload screenshot</p>
                                            <p className="text-xs text-gray-500 mt-1">Gcash/Bank transfer receipt</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </section>

                        {/* Notes */}
                        <section className="bg-white rounded shadow-clinical p-6 border border-gray-100">
                            <h2 className="font-heading text-lg font-bold text-charcoal-900 mb-4">
                                Additional Notes (Optional)
                            </h2>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm h-24"
                                placeholder="Special instructions for delivery..."
                            />
                        </section>

                        <div className="space-y-3">
                            {missingRequirementMessage && (
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-gray-400" />
                                    {missingRequirementMessage}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handlePlaceOrder}
                                disabled={!canPlaceOrder}
                                className={`w-full py-4 rounded font-bold text-base transition-all transform shadow-md flex items-center justify-center gap-2 ${canPlaceOrder
                                    ? 'btn-primary hover:scale-[1.01]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isUploadingProof ? 'Uploading Proof...' : 'Complete Order'}
                            </button>
                        </div>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <OrderSummary
                            cartItems={cartItems}
                            subtotal={totalPrice}
                            shippingFee={shippingFee}
                            discountAmount={discountAmount}
                            finalTotal={finalTotal}
                            hasSelectedRegion={shippingLocation !== ''}
                            promoCode={promoCode}
                            onPromoCodeChange={setPromoCode}
                            onApplyPromo={handleApplyPromoCode}
                            onRemovePromo={handleRemovePromoCode}
                            isPromoApplied={!!appliedPromo}
                            isApplyingPromo={isApplyingPromo}
                            promoError={promoError}
                            promoSuccess={promoSuccess}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
