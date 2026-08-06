import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkout from '../Checkout';
import { mockCartItem, mockCartItemNoVariation } from '../../test/fixtures';

// Mock payment methods data
const mockPaymentMethods = [
    {
        id: 'pm-1',
        name: 'GCash',
        account_number: '09171234567',
        account_name: 'Juan Dela Cruz',
        qr_code_url: 'https://example.com/qr.png',
        active: true,
        sort_order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    },
];

// Mock couriers data
const mockCouriers = [
    {
        id: 'courier-1',
        name: 'LBC Express',
        code: 'lbc',
        tracking_url_template: null,
        is_active: true,
        sort_order: 1,
        created_at: '2024-01-01T00:00:00Z',
    },
];

// Mock shipping locations data
const mockShippingLocations = [
    { id: 'LBC_METRO', name: 'LBC - Metro Manila', fee: 150, is_active: true, order_index: 1 },
    { id: 'LBC_PROVINCIAL', name: 'LBC - Provincial', fee: 200, is_active: true, order_index: 2 },
];

// Mock hooks
vi.mock('../../hooks/usePaymentMethods', () => ({
    usePaymentMethods: () => ({ paymentMethods: mockPaymentMethods, loading: false, error: null }),
}));

vi.mock('../../hooks/useShippingLocations', () => ({
    useShippingLocations: () => ({
        locations: mockShippingLocations,
        loading: false,
        error: null,
        getShippingFee: (id: string) => mockShippingLocations.find(l => l.id === id)?.fee ?? 0,
    }),
}));

vi.mock('../../hooks/useCouriers', () => ({
    useCouriers: () => ({ couriers: mockCouriers, loading: false }),
}));

const mockUploadImage = vi.fn().mockResolvedValue('https://example.com/proof.png');
vi.mock('../../hooks/useImageUpload', () => ({
    useImageUpload: () => ({
        uploadImage: mockUploadImage,
        uploading: false,
        uploadProgress: 0,
    }),
}));

// Mock supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn((table: string) => {
            if (table === 'orders') {
                return {
                    insert: mockInsert.mockReturnValue({
                        select: mockSelect.mockReturnValue({
                            single: mockSingle,
                        }),
                    }),
                };
            }
            if (table === 'promo_codes') {
                return {
                    update: mockUpdate.mockReturnValue({
                        eq: mockEq.mockReturnValue({ error: null }),
                    }),
                };
            }
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
                    }),
                }),
            };
        }),
    },
}));

// Mock clipboard & window.open
Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
vi.spyOn(window, 'open').mockImplementation(() => null);
vi.spyOn(window, 'alert').mockImplementation(() => { });

describe('Checkout - Single Page Order Flow', () => {
    const cartItems = [mockCartItem, mockCartItemNoVariation];
    const totalPrice = mockCartItem.variation!.price * mockCartItem.quantity + 1800; // 1500*2 + 1800 (discounted TB-500)
    const onBack = vi.fn();
    const validateCart = vi.fn().mockResolvedValue([]);

    const renderCheckout = () =>
        render(
            <Checkout
                cartItems={cartItems}
                totalPrice={totalPrice}
                onBack={onBack}
                validateCart={validateCart}
            />
        );

    beforeEach(() => {
        vi.clearAllMocks();
        validateCart.mockResolvedValue([]);
        mockUploadImage.mockResolvedValue('https://example.com/proof.png');
        mockSingle.mockResolvedValue({
            data: { id: 'order-1', order_number: 'ORZ-1234' },
            error: null,
        });
    });

    const fillDetailsForm = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByPlaceholderText('Juan Dela Cruz'), 'Test User');
        await user.type(screen.getByPlaceholderText('e.g. Juan Dela Cruz'), 'Test FB Name');
        await user.type(screen.getByPlaceholderText('09XX XXX XXXX'), '09171234567');
        await user.type(screen.getByPlaceholderText('House/Unit, Street Name'), '123 Main St');
        await user.type(screen.getByPlaceholderText('Brgy. Name'), 'Brgy. Test');
        await user.type(screen.getByPlaceholderText('City'), 'Manila');
        await user.type(screen.getByPlaceholderText('Province'), 'Metro Manila');
        await user.type(screen.getByPlaceholderText('ZIP Code'), '1000');
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
    };

    const uploadProof = async (user: ReturnType<typeof userEvent.setup>) => {
        const file = new File(['proof-image'], 'proof.png', { type: 'image/png' });
        const fileInput = document.getElementById('payment-proof-upload') as HTMLInputElement;
        await user.upload(fileInput, file);
        return file;
    };

    it('renders customer, shipping and payment sections together on one page', () => {
        renderCheckout();

        expect(screen.getByText('Customer Details')).toBeInTheDocument();
        expect(screen.getByText('Shipping Address')).toBeInTheDocument();
        expect(screen.getByText(/Select Courier Provider/)).toBeInTheDocument();
        expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
        expect(screen.getByText('Upload Proof of Payment')).toBeInTheDocument();
    });

    it('does not render multi-step navigation controls', () => {
        renderCheckout();

        expect(screen.queryByText('Proceed to Payment')).not.toBeInTheDocument();
        expect(screen.queryByText('Back to Details')).not.toBeInTheDocument();
        expect(screen.queryByText('Payment & Verification')).not.toBeInTheDocument();
    });

    it('shows a single Complete Order button as the only submit action', () => {
        renderCheckout();

        expect(screen.getAllByRole('button', { name: /complete order/i })).toHaveLength(1);
    });

    it('disables Complete Order when customer details are incomplete', async () => {
        const user = userEvent.setup();
        renderCheckout();

        await uploadProof(user);

        expect(screen.getByRole('button', { name: /complete order/i })).toBeDisabled();
    });

    it('disables Complete Order when payment proof is missing', async () => {
        const user = userEvent.setup();
        renderCheckout();

        await fillDetailsForm(user);

        expect(screen.getByRole('button', { name: /complete order/i })).toBeDisabled();
    });

    it('enables Complete Order once details and payment proof are provided', async () => {
        const user = userEvent.setup();
        renderCheckout();

        await fillDetailsForm(user);
        await uploadProof(user);

        expect(screen.getByRole('button', { name: /complete order/i })).not.toBeDisabled();
    });

    it('includes the shipping fee in the order total on the same page', async () => {
        const user = userEvent.setup();
        renderCheckout();

        await fillDetailsForm(user);

        // Subtotal 4800 + shipping 150 = 4950, shown without leaving the page
        expect(screen.getByText('₱4,950')).toBeInTheDocument();
    });

    it('places the order from the single page and shows the confirmation', async () => {
        const user = userEvent.setup();
        renderCheckout();

        await fillDetailsForm(user);
        const file = await uploadProof(user);
        expect(screen.getByText('proof.png')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /complete order/i }));

        await waitFor(() => {
            expect(mockUploadImage).toHaveBeenCalledWith(file);
            expect(mockInsert).toHaveBeenCalledWith([
                expect.objectContaining({
                    customer_name: 'Test User',
                    customer_email: 'Test FB Name',
                    customer_phone: '09171234567',
                    shipping_address: '123 Main St',
                    shipping_barangay: 'Brgy. Test',
                    shipping_city: 'Manila',
                    shipping_state: 'Metro Manila',
                    shipping_zip_code: '1000',
                    order_status: 'new',
                    payment_status: 'pending',
                    payment_proof_url: 'https://example.com/proof.png',
                    shipping_fee: 150,
                    courier_id: 'courier-1',
                    payment_method_id: 'pm-1',
                    payment_method_name: 'GCash',
                }),
            ]);
        });

        expect(await screen.findByText('Order Confirmed')).toBeInTheDocument();
    });

    it('shows an error and stays on the page when the order insert fails', async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: '500', details: null, hint: null },
        });

        const user = userEvent.setup();
        renderCheckout();

        await fillDetailsForm(user);
        await uploadProof(user);
        await user.click(screen.getByRole('button', { name: /complete order/i }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to save order'));
        });

        expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
        expect(screen.getByText('Customer Details')).toBeInTheDocument();
    });

    it('shows an error and stays on the page when the proof upload fails', async () => {
        mockUploadImage.mockRejectedValueOnce(new Error('Upload failed'));

        const user = userEvent.setup();
        renderCheckout();

        await fillDetailsForm(user);
        await uploadProof(user);
        await user.click(screen.getByRole('button', { name: /complete order/i }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to upload payment proof')
            );
        });

        expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
    });

    it('returns to the cart when Back to Cart is clicked', async () => {
        const user = userEvent.setup();
        renderCheckout();

        await user.click(screen.getByText('Back to Cart'));
        expect(onBack).toHaveBeenCalled();
    });

    it('displays the order summary with cart items', () => {
        renderCheckout();

        expect(screen.getByText('Order Summary')).toBeInTheDocument();
        expect(screen.getByText(/BPC-157/)).toBeInTheDocument();
        expect(screen.getByText(/TB-500/)).toBeInTheDocument();
    });

    it('preselects the first payment method without any step navigation', () => {
        renderCheckout();

        expect(screen.getByText('GCash')).toBeInTheDocument();
        const radio = screen.getByRole('radio') as HTMLInputElement;
        expect(radio.checked).toBe(true);
    });
});
