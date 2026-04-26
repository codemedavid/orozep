-- Adds the 4 real payment methods for BRITT MARIE ANGELICA (BATIAO/ARELLANO).
-- QR images live at /public/qr-codes/*.png (served as static assets by the site).
-- Run this in the Supabase SQL editor.

INSERT INTO public.payment_methods
    (id, name, account_number, account_name, qr_code_url, active, sort_order)
VALUES
    ('b1111111-1111-4111-8111-111111111111', 'Maya',     '09179966191',  'BRITT MARIE ANGELICA ARELLANO', '/qr-codes/maya.png',     true, 10),
    ('b2222222-2222-4222-8222-222222222222', 'BDO',      '003330279847', 'BRITT MARIE ANGELICA BATIAO',   '/qr-codes/bdo.png',      true, 11),
    ('b3333333-3333-4333-8333-333333333333', 'BPI',      '2159385828',   'BRITT MARIE ANGELICA BATIAO',   '/qr-codes/bpi.png',      true, 12),
    ('b4444444-4444-4444-8444-444444444444', 'MariBank', '12724605696',  'BRITT MARIE ANGELICA BATIAO',   '/qr-codes/maribank.png', true, 13)
ON CONFLICT (id) DO UPDATE SET
    name           = EXCLUDED.name,
    account_number = EXCLUDED.account_number,
    account_name   = EXCLUDED.account_name,
    qr_code_url    = EXCLUDED.qr_code_url,
    active         = EXCLUDED.active,
    sort_order     = EXCLUDED.sort_order,
    updated_at     = NOW();

-- Optional: deactivate the old placeholder rows (Peptide Pulse / empty account numbers).
-- Uncomment if you want them hidden from the checkout dropdown.
-- UPDATE public.payment_methods
--    SET active = false
--  WHERE account_name = 'Peptide Pulse'
--     OR account_number IS NULL
--     OR account_number = '';
