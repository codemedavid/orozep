import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { useFAQsAdminMock } = vi.hoisted(() => ({ useFAQsAdminMock: vi.fn() }));

vi.mock('../../hooks/useFAQs', () => ({
  useFAQsAdmin: () => useFAQsAdminMock(),
}));

import FAQManager from '../FAQManager';

const FAQ = {
  id: 'faq-1',
  question: 'How should peptides be stored?',
  answer: 'Refrigerated at 2-8°C.',
  category: 'PRODUCT & USAGE',
  order_index: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

let deleteFAQ: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  deleteFAQ = vi.fn(async () => ({ success: true }));
  useFAQsAdminMock.mockReturnValue({
    faqs: [FAQ],
    loading: false,
    addFAQ: vi.fn(),
    updateFAQ: vi.fn(),
    deleteFAQ,
    refetch: vi.fn(),
  });
});

/**
 * One converted manager exercised end to end. The other eleven were wired with
 * the identical pattern and their placement audited structurally; this proves
 * the pattern itself resolves at runtime rather than hanging on a dialog that
 * never mounts.
 */
describe('FAQManager — typed confirmation wiring', () => {
  it('does not delete on the first click', async () => {
    const user = userEvent.setup();
    render(<FAQManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /delete faq/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(deleteFAQ).not.toHaveBeenCalled();
  });

  it('asks for the FAQ question by name', async () => {
    const user = userEvent.setup();
    render(<FAQManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /delete faq/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/how should peptides be stored/i)).toBeInTheDocument();
  });

  it('deletes once the question has been typed', async () => {
    const user = userEvent.setup();
    render(<FAQManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /delete faq/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), FAQ.question);
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(deleteFAQ).toHaveBeenCalledWith('faq-1');
  });

  it('leaves the FAQ alone when the admin backs out', async () => {
    const user = userEvent.setup();
    render(<FAQManager onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /delete faq/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /cancel/i }));

    expect(deleteFAQ).not.toHaveBeenCalled();
  });
});
