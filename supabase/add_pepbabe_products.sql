-- ============================================================================
-- Orozep PH — Add product catalog
-- Run this in your Supabase SQL Editor (or via `supabase db push` if migrating).
-- Idempotent: safe to re-run; will not duplicate rows.
-- All prices in PHP (₱).
-- ============================================================================

-- 1) Ensure required tables/columns exist before inserting data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Uncategorized',
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_price DECIMAL(10, 2),
  discount_start_date TIMESTAMP WITH TIME ZONE,
  discount_end_date TIMESTAMP WITH TIME ZONE,
  discount_active BOOLEAN DEFAULT false,
  purity_percentage DECIMAL(5, 2) DEFAULT 99.0,
  molecular_weight TEXT,
  cas_number TEXT,
  sequence TEXT,
  storage_conditions TEXT DEFAULT 'Store at -20°C',
  inclusions TEXT[],
  stock_quantity INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  image_url TEXT,
  safety_sheet_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purity_percentage DECIMAL(5, 2) DEFAULT 99.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_conditions TEXT DEFAULT 'Store at -20°C';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;

-- 2) Ensure all referenced categories exist
INSERT INTO public.categories (id, name, icon, sort_order, active)
SELECT category_id, category_name, category_icon, category_sort_order, true
FROM (
  VALUES
    ('c0a80121-0001-4e78-94f8-585d77059001'::uuid, 'Peptides', 'FlaskConical', 1),
    ('c0a80121-0002-4e78-94f8-585d77059002'::uuid, 'Weight Management', 'Scale', 2),
    ('c0a80121-0003-4e78-94f8-585d77059003'::uuid, 'Beauty & Anti-Aging', 'Sparkles', 3),
    ('c0a80121-0004-4e78-94f8-585d77059004'::uuid, 'Wellness & Vitality', 'Heart', 4),
    ('c0a80121-0009-4e78-94f8-585d77059009'::uuid, 'Fat Dissolvers', 'Droplet', 9)
) AS required_categories(category_id, category_name, category_icon, category_sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories
  WHERE name = required_categories.category_name
);

UPDATE public.categories
SET active = true,
    updated_at = NOW()
WHERE name IN (
  'Peptides',
  'Weight Management',
  'Beauty & Anti-Aging',
  'Wellness & Vitality',
  'Fat Dissolvers'
);


-- 3) Insert products (skips any that already exist by name)

-- ── Tirzepatide 15mg ───────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Tirzepatide 15mg (Tr15)',
  'Dual GIP/GLP-1 receptor agonist for weight management and glycemic control. 15mg vial.',
  2000.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 50, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Tirzepatide 15mg (Tr15)');

-- ── Tirzepatide 30mg ───────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Tirzepatide 30mg (Tr30)',
  'Dual GIP/GLP-1 receptor agonist for weight management and glycemic control. 30mg vial.',
  2500.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 50, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Tirzepatide 30mg (Tr30)');

-- ── Tirzepatide 60mg ───────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Tirzepatide 60mg (TR60)',
  'High-dose dual GIP/GLP-1 receptor agonist for weight management and glycemic control. 60mg vial.',
  4500.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 30, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Tirzepatide 60mg (TR60)');

-- ── GHK-Cu 100mg ───────────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'GHK-Cu 100mg (Ghk100)',
  'Copper peptide complex for skin regeneration, anti-aging, and wound healing. 100mg vial.',
  2000.00,
  (SELECT id::text FROM public.categories WHERE name = 'Beauty & Anti-Aging' LIMIT 1),
  true, true, 40, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'GHK-Cu 100mg (Ghk100)');

-- ── Cagrilintide 10mg ──────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Cagrilintide 10mg (Cagri10)',
  'Long-acting amylin analogue for appetite suppression and weight management. 10mg vial.',
  3500.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 30, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Cagrilintide 10mg (Cagri10)');

-- ── Glutathione 1500mg ─────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Glutathione 1500mg (Gtt1500)',
  'High-potency glutathione for skin brightening, antioxidant support, and detoxification. 1500mg vial.',
  2100.00,
  (SELECT id::text FROM public.categories WHERE name = 'Beauty & Anti-Aging' LIMIT 1),
  true, true, 50, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Glutathione 1500mg (Gtt1500)');

-- ── Retatrutide 20mg ───────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Retatrutide 20mg (Reta20)',
  'Triple agonist (GLP-1, GIP, glucagon) for advanced weight management. 20mg vial.',
  2500.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 30, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Retatrutide 20mg (Reta20)');

-- ── Retatrutide 30mg ───────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Retatrutide 30mg (Reta30)',
  'High-dose triple agonist (GLP-1, GIP, glucagon) for advanced weight management. 30mg vial.',
  3500.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 25, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Retatrutide 30mg (Reta30)');

-- ── NAD+ 100mg ─────────────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'NAD+ 100mg (Nad100)',
  'Nicotinamide adenine dinucleotide for cellular energy, longevity, and mitochondrial support. 100mg vial.',
  2000.00,
  (SELECT id::text FROM public.categories WHERE name = 'Wellness & Vitality' LIMIT 1),
  true, true, 40, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'NAD+ 100mg (Nad100)');

-- ── KPV 10mg ───────────────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'KPV 10mg (Kpv10)',
  'Tripeptide with anti-inflammatory and gut-healing properties. 10mg vial.',
  1900.00,
  (SELECT id::text FROM public.categories WHERE name = 'Peptides' LIMIT 1),
  true, false, 40, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'KPV 10mg (Kpv10)');

-- ── Lemon Bottle ───────────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Lemon Bottle',
  'Premium advanced lipolysis solution for targeted fat dissolving and body contouring.',
  1600.00,
  (SELECT id::text FROM public.categories WHERE name = 'Fat Dissolvers' LIMIT 1),
  true, true, 40, 99.0, 'Store at room temperature, away from light'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Lemon Bottle');

-- ── Fat Blaster ────────────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'Fat Blaster',
  'Targeted fat dissolver formulation for stubborn fat areas. Lipolytic body contouring solution.',
  2500.00,
  (SELECT id::text FROM public.categories WHERE name = 'Fat Dissolvers' LIMIT 1),
  true, true, 30, 99.0, 'Store at room temperature, away from light'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Fat Blaster');

-- ── AOD 5mg ────────────────────────────────────────────────────────────────
INSERT INTO public.products
  (name, description, base_price, category, available, featured, stock_quantity, purity_percentage, storage_conditions)
SELECT
  'AOD-9604 5mg (AOD 5mg)',
  'Modified fragment of human growth hormone targeting fat metabolism. 5mg vial.',
  2200.00,
  (SELECT id::text FROM public.categories WHERE name = 'Weight Management' LIMIT 1),
  true, true, 30, 99.0, 'Store at -20°C'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'AOD-9604 5mg (AOD 5mg)');


-- 4) (Optional) If you have already inserted these and just need to update prices,
--    uncomment the block below to force-update prices to the latest catalog.
--
-- UPDATE public.products SET base_price = 2000.00 WHERE name = 'Tirzepatide 15mg (Tr15)';
-- UPDATE public.products SET base_price = 2500.00 WHERE name = 'Tirzepatide 30mg (Tr30)';
-- UPDATE public.products SET base_price = 4500.00 WHERE name = 'Tirzepatide 60mg (TR60)';
-- UPDATE public.products SET base_price = 2000.00 WHERE name = 'GHK-Cu 100mg (Ghk100)';
-- UPDATE public.products SET base_price = 3500.00 WHERE name = 'Cagrilintide 10mg (Cagri10)';
-- UPDATE public.products SET base_price = 2100.00 WHERE name = 'Glutathione 1500mg (Gtt1500)';
-- UPDATE public.products SET base_price = 2500.00 WHERE name = 'Retatrutide 20mg (Reta20)';
-- UPDATE public.products SET base_price = 3500.00 WHERE name = 'Retatrutide 30mg (Reta30)';
-- UPDATE public.products SET base_price = 2000.00 WHERE name = 'NAD+ 100mg (Nad100)';
-- UPDATE public.products SET base_price = 1900.00 WHERE name = 'KPV 10mg (Kpv10)';
-- UPDATE public.products SET base_price = 1600.00 WHERE name = 'Lemon Bottle';
-- UPDATE public.products SET base_price = 2500.00 WHERE name = 'Fat Blaster';
-- UPDATE public.products SET base_price = 2200.00 WHERE name = 'AOD-9604 5mg (AOD 5mg)';


-- 5) Verify
SELECT name, base_price, category, available, featured, stock_quantity
FROM public.products
WHERE name IN (
  'Tirzepatide 15mg (Tr15)',
  'Tirzepatide 30mg (Tr30)',
  'Tirzepatide 60mg (TR60)',
  'GHK-Cu 100mg (Ghk100)',
  'Cagrilintide 10mg (Cagri10)',
  'Glutathione 1500mg (Gtt1500)',
  'Retatrutide 20mg (Reta20)',
  'Retatrutide 30mg (Reta30)',
  'NAD+ 100mg (Nad100)',
  'KPV 10mg (Kpv10)',
  'Lemon Bottle',
  'Fat Blaster',
  'AOD-9604 5mg (AOD 5mg)'
)
ORDER BY name;
