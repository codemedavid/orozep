import { describe, it, expect } from 'vitest';
import { resolveCourierCode, getCourierDisplay, UNKNOWN_COURIER_NAME } from '../couriers';
import type { Courier } from '../../hooks/useCouriers';

function courier(overrides: Partial<Courier> & Pick<Courier, 'code' | 'name'>): Courier {
    return {
        id: `id-${overrides.code}`,
        tracking_url_template: null,
        is_active: true,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

// The shop's live courier list: LBC was deleted by the admin, only J&T remains.
const JNT = courier({
    code: 'jnt',
    name: 'J&T Express',
    tracking_url_template: 'https://www.jtexpress.ph/trajectoryQuery?bills={tracking}',
    sort_order: 0,
});
const LALAMOVE = courier({ code: 'lalamove', name: 'Lalamove', sort_order: 1 });
const RETIRED = courier({ code: 'retired', name: 'Retired Courier', is_active: false, sort_order: 2 });

describe('resolveCourierCode', () => {
    it('never falls back to a hardcoded courier when the order has no provider set', () => {
        // Regression: the admin form defaulted to 'lbc' even though LBC was deleted,
        // so saving an untouched form wrote 'lbc' into the order.
        expect(resolveCourierCode(null, [JNT])).toBe('jnt');
    });

    it('replaces a stored code that no longer exists in the courier list', () => {
        // 'lbc' has no <option> to render, so the select would silently display J&T
        // while still submitting 'lbc'.
        expect(resolveCourierCode('lbc', [JNT])).toBe('jnt');
    });

    it('keeps a stored code that still matches an active courier', () => {
        expect(resolveCourierCode('lalamove', [JNT, LALAMOVE])).toBe('lalamove');
    });

    it('ignores inactive couriers when resolving', () => {
        expect(resolveCourierCode('retired', [JNT, RETIRED])).toBe('jnt');
    });

    it('returns an empty selection when no active courier is available', () => {
        // Do not invent a courier while the list is still loading or empty.
        expect(resolveCourierCode('jnt', [])).toBe('');
        expect(resolveCourierCode(null, [RETIRED])).toBe('');
    });

    it('picks the first courier by sort order, not by array position', () => {
        expect(resolveCourierCode(null, [LALAMOVE, JNT])).toBe('jnt');
    });
});

describe('getCourierDisplay', () => {
    it('names the courier from the courier list', () => {
        const display = getCourierDisplay('jnt', [JNT], '600017794686');

        expect(display.name).toBe('J&T Express');
        expect(display.isKnown).toBe(true);
    });

    it('builds the tracking URL from the courier template', () => {
        const display = getCourierDisplay('jnt', [JNT], '600017794686');

        expect(display.trackingUrl).toBe(
            'https://www.jtexpress.ph/trajectoryQuery?bills=600017794686',
        );
    });

    it('does not claim a deleted courier shipped the order', () => {
        // Regression for ORZ-13941: the storefront rendered "LBC Express" and an
        // lbcexpress.com link from a hardcoded map, for a courier the shop deleted.
        const display = getCourierDisplay('lbc', [JNT], '600017794686');

        expect(display.name).toBe(UNKNOWN_COURIER_NAME);
        expect(display.name).not.toMatch(/LBC/i);
        expect(display.isKnown).toBe(false);
    });

    it('offers no tracking link for a courier it cannot identify', () => {
        const display = getCourierDisplay('lbc', [JNT], '600017794686');

        expect(display.trackingUrl).toBeNull();
    });

    it('still names a deactivated courier that shipped a historical order', () => {
        const display = getCourierDisplay('retired', [JNT, RETIRED], '123');

        expect(display.name).toBe('Retired Courier');
        expect(display.isKnown).toBe(true);
    });

    it('offers no tracking link when the courier has no URL template', () => {
        expect(getCourierDisplay('lalamove', [JNT, LALAMOVE], '123').trackingUrl).toBeNull();
    });

    it('offers no tracking link when the order has no tracking number', () => {
        expect(getCourierDisplay('jnt', [JNT], null).trackingUrl).toBeNull();
    });

    it('encodes the tracking number into the URL', () => {
        const display = getCourierDisplay('jnt', [JNT], 'a b&c');

        expect(display.trackingUrl).toBe(
            'https://www.jtexpress.ph/trajectoryQuery?bills=a%20b%26c',
        );
    });

    it('treats a missing provider as unknown rather than guessing', () => {
        const display = getCourierDisplay(null, [JNT], '123');

        expect(display.isKnown).toBe(false);
        expect(display.trackingUrl).toBeNull();
    });
});
