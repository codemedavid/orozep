-- Fix couriers table for admin dashboard
-- The admin dashboard uses password protection, not Supabase authentication,
-- so all requests go as the `anon` role. The original policy only allowed
-- the `authenticated` role to manage couriers, which silently blocked
-- add/edit/delete from the admin UI.

-- 1. Ensure table exists (no-op if it was already created by the migration)
CREATE TABLE IF NOT EXISTS couriers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  tracking_url_template TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (safe to call repeatedly)
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

-- 3. Drop old restrictive policies
DROP POLICY IF EXISTS "Allow public read access to couriers" ON couriers;
DROP POLICY IF EXISTS "Allow authenticated users to manage couriers" ON couriers;

-- 4. Create permissive policy matching the pattern used for payment_methods
--    and site_settings (admin is protected by password on the frontend,
--    not by database auth)
CREATE POLICY "Allow public full access to couriers"
  ON couriers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Seed default couriers if the table is empty
INSERT INTO couriers (name, code, tracking_url_template, is_active, sort_order) VALUES
  ('LBC Express', 'lbc', 'https://www.lbcexpress.com/track/?tracking_no={tracking}', true, 1),
  ('Lalamove', 'lalamove', NULL, true, 2),
  ('Maxim', 'maxim', NULL, true, 3),
  ('J&T Express', 'jnt', 'https://www.jtexpress.ph/trajectoryQuery?waybillNo={tracking}', true, 4)
ON CONFLICT (code) DO NOTHING;

-- 6. Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'couriers'
    AND policyname = 'Allow public full access to couriers'
  ) THEN
    RAISE NOTICE 'Couriers permissions updated successfully';
  ELSE
    RAISE EXCEPTION 'Failed to update couriers permissions';
  END IF;
END $$;
