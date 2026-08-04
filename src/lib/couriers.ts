import type { Courier } from '../hooks/useCouriers';

/**
 * Shown instead of a courier name when an order references a courier that is not
 * in the couriers table (for example one the admin deleted). Naming a specific
 * courier here would tell the customer something we cannot verify.
 */
export const UNKNOWN_COURIER_NAME = 'Courier';

const TRACKING_PLACEHOLDER = '{tracking}';

const bySortOrder = (a: Courier, b: Courier): number => a.sort_order - b.sort_order;

/**
 * Picks the courier code an admin form should hold for an order.
 *
 * A `<select>` whose value matches no `<option>` renders the first option while
 * keeping the unmatched value in state, so the form would submit a courier the
 * admin never saw. This always returns a code the form can actually display, or
 * an empty string when there is nothing valid to pick.
 */
export function resolveCourierCode(storedCode: string | null, couriers: Courier[]): string {
    const selectable = couriers.filter(courier => courier.is_active);

    if (storedCode && selectable.some(courier => courier.code === storedCode)) {
        return storedCode;
    }

    const [firstCourier] = [...selectable].sort(bySortOrder);
    return firstCourier?.code ?? '';
}

export interface CourierDisplay {
    /** Courier name for the customer, or UNKNOWN_COURIER_NAME when unidentifiable. */
    name: string;
    /** Deep link to the courier's tracking page, or null when none can be built. */
    trackingUrl: string | null;
    /** False when the order's courier code is missing from the couriers table. */
    isKnown: boolean;
}

/**
 * Describes an order's courier using the couriers table as the only source of
 * truth. Deactivated couriers still resolve, so historical orders keep their
 * real courier name.
 */
export function getCourierDisplay(
    code: string | null,
    couriers: Courier[],
    trackingNumber: string | null,
): CourierDisplay {
    const courier = code ? couriers.find(candidate => candidate.code === code) : undefined;

    if (!courier) {
        return { name: UNKNOWN_COURIER_NAME, trackingUrl: null, isKnown: false };
    }

    return {
        name: courier.name,
        trackingUrl: buildTrackingUrl(courier, trackingNumber),
        isKnown: true,
    };
}

function buildTrackingUrl(courier: Courier, trackingNumber: string | null): string | null {
    if (!courier.tracking_url_template || !trackingNumber) return null;

    return courier.tracking_url_template.replace(
        TRACKING_PLACEHOLDER,
        encodeURIComponent(trackingNumber),
    );
}
