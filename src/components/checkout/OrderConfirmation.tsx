import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, Activity, Copy, Check, MessageCircle } from 'lucide-react';

const CONTACT_NUMBER = '639179966191';
const MESSENGER_HANDLE = 'britt.arellano.7';
const WHATSAPP_AUTO_OPEN_DELAY_MS = 1500;

interface OrderConfirmationProps {
    orderNumber: string;
    orderMessage: string;
}

/**
 * Post-order receipt. Auto-copies the order summary and nudges the customer
 * into their messaging app so the order can be confirmed by a human.
 */
const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ orderNumber, orderMessage }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        navigator.clipboard
            .writeText(orderMessage)
            .then(() => setCopied(true))
            .catch((error) => console.error('Failed to auto-copy order details:', error));

        const timer = setTimeout(() => {
            window.open(
                `https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent(orderMessage)}`,
                '_blank'
            );
        }, WHATSAPP_AUTO_OPEN_DELAY_MS);

        return () => clearTimeout(timer);
    }, [orderMessage]);

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(orderMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy. Please manually select and copy the message.');
        }
    };

    const handleOpenWhatsApp = () => {
        window.open(
            `https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent(orderMessage)}`,
            '_blank'
        );
    };

    const handleOpenViber = () => {
        window.open(`viber://chat?number=%2B${CONTACT_NUMBER}`, '_blank');
    };

    const handleOpenMessenger = async () => {
        try {
            await navigator.clipboard.writeText(orderMessage);
            setCopied(true);
        } catch (error) {
            console.error('Failed to copy before opening Messenger:', error);
        }
        window.open(`https://m.me/${MESSENGER_HANDLE}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-brand-50 to-white flex items-center justify-center px-4 py-12">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded shadow-clinical p-8 md:p-12 text-center border border-gray-100">
                    <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ShieldCheck className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h1 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900 mb-4 tracking-tight">
                        Order Confirmed
                    </h1>
                    <p className="text-gray-600 mb-4 text-base md:text-lg leading-relaxed">
                        Your order details have been pre-filled. Just hit send via WhatsApp to finalize your order!
                    </p>

                    {orderNumber && (
                        <div className="bg-brand-50/20 border border-brand-100 rounded-lg p-4 mb-6">
                            <p className="text-sm text-brand-700 mb-1 font-bold uppercase tracking-wider">Order Reference</p>
                            <p className="text-2xl font-bold text-charcoal-900 font-mono">{orderNumber}</p>
                            <p className="text-xs text-gray-500 mt-2">Use this reference for tracking and support</p>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-charcoal-900 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-brand-600" />
                                Order Details
                            </h2>
                            <button
                                onClick={handleCopyMessage}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded font-medium transition-all text-sm shadow-sm"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="bg-white rounded p-4 border border-gray-300 max-h-64 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{orderMessage}</pre>
                        </div>
                        {copied && (
                            <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1 font-medium">
                                <Check className="w-4 h-4" />
                                Copied to clipboard! Ready to send.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3 mb-8">
                        <button
                            onClick={handleOpenWhatsApp}
                            className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2 shadow-lg"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Open WhatsApp &amp; Send
                        </button>

                        <button
                            onClick={handleOpenViber}
                            className="w-full py-4 text-base flex items-center justify-center gap-2 shadow-lg rounded bg-[#7360f2] hover:bg-[#5d4dd1] text-white font-medium transition-all"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Open Viber &amp; Send
                        </button>

                        <button
                            onClick={handleOpenMessenger}
                            className="w-full py-4 text-base flex items-center justify-center gap-2 shadow-lg rounded bg-[#0084ff] hover:bg-[#006fdb] text-white font-medium transition-all"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Open Messenger &amp; Paste
                        </button>

                        <p className="text-sm text-gray-500">
                            Your order details are auto-copied. If no app opens, send the copied message to{' '}
                            <span className="font-bold">+63 917 996 6191 on WhatsApp/Viber</span> or{' '}
                            <span className="font-bold">m.me/britt.arellano.7 on Messenger</span>.
                        </p>
                    </div>

                    <div className="bg-brand-50/20 rounded-lg p-6 mb-8 text-left border border-brand-100">
                        <h2 className="font-bold text-charcoal-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-600" />
                            Next Steps
                        </h2>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start gap-3">
                                <span className="font-bold text-brand-500">1.</span>
                                <span>Confirmation within 24 hours of payment receipt.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold text-brand-500">2.</span>
                                <span>Research-grade packaging and secure handling.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold text-brand-500">3.</span>
                                <span>Same-day shipping for verified payments before 11 AM.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold text-brand-500">4.</span>
                                <span>Tracking details sent via your selected contact method after dispatch.</span>
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            window.location.href = '/';
                        }}
                        className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return to Catalog
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
