import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Hoisted handle so the mock factory can reference it.
const { useMenuMock } = vi.hoisted(() => ({ useMenuMock: vi.fn() }));

vi.mock('../../hooks/useMenu', () => ({
  useMenu: () => useMenuMock(),
}));

import RecycleBinManager from '../RecycleBinManager';

/** ISO stamp `n` days before now, so the purge countdown is deterministic. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const RECENTLY_BINNED = {
  id: 'prod-1',
  name: 'Retatrutide 10mg',
  stock_quantity: 12,
  deleted_at: daysAgo(2),
  deleted_by: null,
  variations: [],
};

const NEARLY_PURGED = {
  id: 'prod-2',
  name: 'GHK-Cu 50mg',
  stock_quantity: 5,
  deleted_at: daysAgo(29),
  deleted_by: null,
  variations: [],
};

let fetchDeletedProducts: ReturnType<typeof vi.fn>;
let restoreProduct: ReturnType<typeof vi.fn>;

function setupHook(binContents: unknown[][] = [[RECENTLY_BINNED, NEARLY_PURGED]]) {
  let call = 0;
  fetchDeletedProducts = vi.fn(async () => binContents[Math.min(call++, binContents.length - 1)]);
  restoreProduct = vi.fn(async () => ({ success: true }));
  useMenuMock.mockReturnValue({ fetchDeletedProducts, restoreProduct });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe('RecycleBinManager', () => {
  it('names itself so the admin knows what they are looking at', async () => {
    render(<RecycleBinManager onBack={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: /recently deleted/i })).toBeInTheDocument();
  });

  it('lists every product sitting in the bin', async () => {
    render(<RecycleBinManager onBack={vi.fn()} />);

    expect(await screen.findByText('Retatrutide 10mg')).toBeInTheDocument();
    expect(screen.getByText('GHK-Cu 50mg')).toBeInTheDocument();
  });

  it('tells the admin how long is left before each item is purged', async () => {
    render(<RecycleBinManager onBack={vi.fn()} />);

    // Binned 2 days ago out of a 30-day window.
    expect(await screen.findByText(/28 days left/i)).toBeInTheDocument();
    // Binned 29 days ago — the last day before it goes for good.
    expect(screen.getByText(/1 day left/i)).toBeInTheDocument();
  });

  it('offers a restore action for each binned product', async () => {
    render(<RecycleBinManager onBack={vi.fn()} />);

    await screen.findByText('Retatrutide 10mg');
    expect(screen.getAllByRole('button', { name: /restore/i })).toHaveLength(2);
  });

  it('restores the product the admin picked', async () => {
    const user = userEvent.setup();
    render(<RecycleBinManager onBack={vi.fn()} />);

    await screen.findByText('Retatrutide 10mg');
    await user.click(screen.getAllByRole('button', { name: /restore/i })[0]);

    expect(restoreProduct).toHaveBeenCalledWith('prod-1');
  });

  it('drops the item from the bin once it is restored', async () => {
    const user = userEvent.setup();
    // Second read of the bin no longer contains the restored product.
    setupHook([[RECENTLY_BINNED, NEARLY_PURGED], [NEARLY_PURGED]]);
    render(<RecycleBinManager onBack={vi.fn()} />);

    await screen.findByText('Retatrutide 10mg');
    await user.click(screen.getAllByRole('button', { name: /restore/i })[0]);

    await waitFor(() => expect(screen.queryByText('Retatrutide 10mg')).not.toBeInTheDocument());
    expect(screen.getByText('GHK-Cu 50mg')).toBeInTheDocument();
  });

  it('says so plainly when the bin is empty', async () => {
    setupHook([[]]);
    render(<RecycleBinManager onBack={vi.fn()} />);

    expect(await screen.findByText(/nothing in the bin/i)).toBeInTheDocument();
  });

  it('surfaces a failed restore instead of silently doing nothing', async () => {
    const user = userEvent.setup();
    render(<RecycleBinManager onBack={vi.fn()} />);
    restoreProduct.mockResolvedValueOnce({ success: false, error: 'Permission denied' });

    await screen.findByText('Retatrutide 10mg');
    await user.click(screen.getAllByRole('button', { name: /restore/i })[0]);

    expect(await screen.findByText(/permission denied/i)).toBeInTheDocument();
    // The product stays put so the admin can try again.
    expect(screen.getByText('Retatrutide 10mg')).toBeInTheDocument();
  });

  it('returns the admin to the dashboard', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<RecycleBinManager onBack={onBack} />);

    await screen.findByText('Retatrutide 10mg');
    await user.click(screen.getByRole('button', { name: /dashboard/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('never offers a hard purge control — expiry is the only way out', async () => {
    render(<RecycleBinManager onBack={vi.fn()} />);

    await screen.findByText('Retatrutide 10mg');
    // A "delete forever" button in the recovery UI would defeat its purpose.
    expect(screen.queryByRole('button', { name: /forever|permanently|purge/i })).toBeNull();
  });
});
