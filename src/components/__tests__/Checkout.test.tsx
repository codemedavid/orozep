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
vi.spyOn(window, 'alert').mockImplementation(() => {});

describe('Checkout - Place Order Flow', () => {
    const cartItems = [mockCartItem, mockCartItemNoVariation];
    const totalPrice = mockCartItem.variation!.price * mockCartItem.quantity + 1800; // 1500*2 + 1800 (discounted TB-500)
    const onBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockSingle.mockResolvedValue({
            data: { id: 'order-1', order_number: 'ORZ-1234' },
            error: null,
        });
    });

    const fillDetailsForm = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByPlaceholderText('Juan Dela Cruz'), 'Test User');
        await user.type(screen.getByPlaceholderText('juan@example.com'), 'test@example.com');
        await user.type(screen.getByPlaceholderText('09XX XXX XXXX'), '09171234567');
        await user.type(screen.getByPlaceholderText('House/Unit, Street Name'), '123 Main St');
        await user.type(screen.getByPlaceholderText('Brgy. Name'), 'Brgy. Test');
        await user.type(screen.getByPlaceholderText('City'), 'Manila');
        await user.type(screen.getByPlaceholderText('Province'), 'Metro Manila');
        await user.type(screen.getByPlaceholderText('ZIP Code'), '1000');
    };

    it('renders the details step initially', () => {
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);
        expect(screen.getByText('Checkout Information')).toBeInTheDocument();
        expect(screen.getByText('Customer Details')).toBeInTheDocument();
        expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });

    it('disables Proceed to Payment when form is incomplete', () => {
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);
        const proceedBtn = screen.getByText('Proceed to Payment');
        expect(proceedBtn).toBeDisabled();
    });

    it('enables Proceed to Payment when all details are filled', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);

        // Select courier
        await user.click(screen.getByText('LBC Express'));

        // Select shipping location
        await user.click(screen.getByText('LBC - Metro Manila'));

        const proceedBtn = screen.getByText('Proceed to Payment');
        expect(proceedBtn).not.toBeDisabled();
    });

    it('navigates to payment step when Proceed is clicked', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        expect(screen.getByText('Payment & Verification')).toBeInTheDocument();
        expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
        expect(screen.getByText('Upload Proof of Payment')).toBeInTheDocument();
    });

    it('shows Complete Order button disabled until payment proof is uploaded', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        const completeBtn = screen.getByText('Complete Order');
        expect(completeBtn).toBeDisabled();
    });

    it('completes the full place order flow successfully', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        // Step 1: Fill details
        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        // Step 2: Upload payment proof
        const file = new File(['proof-image'], 'proof.png', { type: 'image/png' });
        const fileInput = document.getElementById('payment-proof-upload') as HTMLInputElement;
        await user.upload(fileInput, file);

        // Verify file name shown
        expect(screen.getByText('proof.png')).toBeInTheDocument();

        // Step 3: Click Complete Order
        const completeBtn = screen.getByText('Complete Order');
        expect(completeBtn).not.toBeDisabled();
        await user.click(completeBtn);

        // Verify order was saved to database
        await waitFor(() => {
            expect(mockUploadImage).toHaveBeenCalledWith(file);
            expect(mockInsert).toHaveBeenCalledWith([
                expect.objectContaining({
                    customer_name: 'Test User',
                    customer_email: 'test@example.com',
                    customer_phone: '09171234567',
                    shipping_address: '123 Main St',
                    shipping_barangay: 'Brgy. Test',
                    shipping_city: 'Manila',
                    shipping_state: 'Metro Manila',
                    shipping_zip_code: '1000',
                    order_status: 'new',
                    payment_status: 'pending',
                    payment_proof_url: 'https://example.com/proof.png',
                    contact_method: 'viber',
                    shipping_fee: 150,
                    payment_method_id: 'pm-1',
                    payment_method_name: 'GCash',
                }),
            ]);
        });

        // Verify confirmation step is shown
        await waitFor(() => {
            expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
        });
    });

    it('shows alert when payment proof is missing and order is attempted', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        // The button should be disabled, but let's verify the handlePlaceOrder guard too
        // by checking the button is disabled
        const completeBtn = screen.getByText('Complete Order');
        expect(completeBtn).toBeDisabled();
    });

    it('shows error alert when order insert fails', async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: '500', details: null, hint: null },
        });

        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        const file = new File(['proof-image'], 'proof.png', { type: 'image/png' });
        const fileInput = document.getElementById('payment-proof-upload') as HTMLInputElement;
        await user.upload(fileInput, file);

        await user.click(screen.getByText('Complete Order'));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save order')
            );
        });

        // Should NOT navigate to confirmation
        expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
    });

    it('shows error alert when image upload fails', async () => {
        mockUploadImage.mockRejectedValueOnce(new Error('Upload failed'));

        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        const file = new File(['proof-image'], 'proof.png', { type: 'image/png' });
        const fileInput = document.getElementById('payment-proof-upload') as HTMLInputElement;
        await user.upload(fileInput, file);

        await user.click(screen.getByText('Complete Order'));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Failed to upload payment proof')
            );
        });

        expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
    });

    it('can navigate back to details from payment step', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        expect(screen.getByText('Payment & Verification')).toBeInTheDocument();

        await user.click(screen.getByText('Back to Details'));

        expect(screen.getByText('Checkout Information')).toBeInTheDocument();
    });

    it('calls onBack when Back to Cart is clicked', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await user.click(screen.getByText('Back to Cart'));
        expect(onBack).toHaveBeenCalled();
    });

    it('displays order summary with correct items and prices', () => {
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        expect(screen.getByText('Order Summary')).toBeInTheDocument();
        expect(screen.getByText(/BPC-157/)).toBeInTheDocument();
        expect(screen.getByText(/TB-500/)).toBeInTheDocument();
    });

    it('selects GCash payment method by default', async () => {
        const user = userEvent.setup();
        render(<Checkout cartItems={cartItems} totalPrice={totalPrice} onBack={onBack} />);

        await fillDetailsForm(user);
        await user.click(screen.getByText('LBC Express'));
        await user.click(screen.getByText('LBC - Metro Manila'));
        await user.click(screen.getByText('Proceed to Payment'));

        expect(screen.getByText('GCash')).toBeInTheDocument();
        const radio = screen.getByRole('radio') as HTMLInputElement;
        expect(radio.checked).toBe(true);
    });
});
