import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { rpcMock, singleMock, couriersMock } = vi.hoisted(() => {
    const singleMock = vi.fn();
    return {
        singleMock,
        rpcMock: vi.fn(() => ({ single: singleMock })),
        couriersMock: vi.fn(),
    };
});

vi.mock('../../lib/supabase', () => ({ supabase: { rpc: rpcMock } }));
vi.mock('../../hooks/useCouriers', () => ({ useCouriers: () => couriersMock() }));

import OrderTracking from '../OrderTracking';

const JNT = {
    id: 'courier-jnt',
    name: 'J&T Express',
    code: 'jnt',
    tracking_url_template: 'https://www.jtexpress.ph/trajectoryQuery?bills={tracking}',
    is_active: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
};

function shippedOrder(overrides: Record<string, unknown> = {}) {
    return {
        id: 'order-1',
        order_number: 'ORZ-13941',
        order_status: 'shipped',
        payment_status: 'paid',
        tracking_number: '600017794686',
        shipping_provider: 'jnt',
        shipping_note: null,
        total_price: 1650,
        shipping_fee: 0,
        order_items: [{ product_name: 'Tirzepatide 15mg (kit)', quantity: 1 }],
        created_at: '2026-08-03T06:09:31Z',
        promo_code: null,
        discount_applied: null,
        ...overrides,
    };
}

async function trackOrder() {
    const user = userEvent.setup();
    render(<OrderTracking />);

    await user.type(screen.getByPlaceholderText(/order number/i), 'ORZ-13941');
    await user.click(screen.getByRole('button', { name: /track order/i }));
}

beforeEach(() => {
    rpcMock.mockClear();
    singleMock.mockReset();
    // The shop deleted LBC — only J&T remains in the couriers table.
    couriersMock.mockReturnValue({ couriers: [JNT], loading: false });
});

describe('OrderTracking courier display', () => {
    it('names the courier from the couriers table', async () => {
        singleMock.mockResolvedValue({ data: shippedOrder(), error: null });

        await trackOrder();

        expect(await screen.findAllByText(/J&T Express/)).not.toHaveLength(0);
    });

    it('links to the tracking URL built from the courier template', async () => {
        singleMock.mockResolvedValue({ data: shippedOrder(), error: null });

        await trackOrder();

        const link = await screen.findByRole('link', { name: /track on J&T Express/i });
        expect(link).toHaveAttribute(
            'href',
            'https://www.jtexpress.ph/trajectoryQuery?bills=600017794686',
        );
    });

    it('does not show a deleted courier the shop no longer uses', async () => {
        // Regression for ORZ-13941: stored provider 'lbc' rendered as "LBC Express"
        // from a hardcoded map, even though the admin deleted LBC.
        singleMock.mockResolvedValue({ data: shippedOrder({ shipping_provider: 'lbc' }), error: null });

        await trackOrder();

        expect(await screen.findByText('600017794686')).toBeInTheDocument();
        expect(screen.queryByText(/LBC/i)).not.toBeInTheDocument();
    });

    it('does not link to a deleted courier tracking site', async () => {
        singleMock.mockResolvedValue({ data: shippedOrder({ shipping_provider: 'lbc' }), error: null });

        await trackOrder();

        await screen.findByText('600017794686');
        const lbcLinks = screen
            .queryAllByRole('link')
            .filter((link) => link.getAttribute('href')?.includes('lbcexpress.com'));
        expect(lbcLinks).toHaveLength(0);
    });

    it('does not mislabel an unknown courier as J&T Express', async () => {
        singleMock.mockResolvedValue({ data: shippedOrder({ shipping_provider: 'lbc' }), error: null });

        await trackOrder();

        await screen.findByText('600017794686');
        expect(screen.queryAllByText(/J&T Express/)).toHaveLength(0);
    });

    it('still shows the tracking number when the courier has no tracking site', async () => {
        couriersMock.mockReturnValue({
            couriers: [{ ...JNT, code: 'lalamove', name: 'Lalamove', tracking_url_template: null }],
            loading: false,
        });
        singleMock.mockResolvedValue({
            data: shippedOrder({ shipping_provider: 'lalamove' }),
            error: null,
        });

        await trackOrder();

        expect(await screen.findByText('600017794686')).toBeInTheDocument();
        expect(screen.getAllByText(/Lalamove/)).not.toHaveLength(0);
    });
});
