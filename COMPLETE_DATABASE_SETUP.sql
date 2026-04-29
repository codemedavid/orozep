-- ============================================================================
-- PEPBABE / PEPTIDE PULSE — COMPLETE DATABASE SETUP
-- ============================================================================
-- Run this entire file in the Supabase SQL Editor of your new project.
-- It is idempotent: safe to run multiple times.
--
-- Includes:
--   1. Extensions & helper functions
--   2. All tables (categories, products, variations, site_settings,
--      payment_methods, shipping_locations, couriers, promo_codes, orders,
--      coa_reports, faqs, guide_topics, protocols, reviews, review_products)
--   3. Storage buckets (payment-proofs, product-images, article-covers,
--      menu-images) + permissive policies
--   4. Seed data (categories, couriers, shipping rates, payment methods,
--      sample products + variations, default protocols)
--   5. RPC: get_order_details
--   6. NOTIFY pgrst to reload schema cache
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & HELPERS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. TABLES
-- ============================================================================
-- Note: this app's admin uses a frontend password (anon key), not Supabase
-- Auth, so RLS is DISABLED on every table and ALL is granted to anon.

-- 2.1 Categories ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;

-- 2.2 Products -----------------------------------------------------------------
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
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;

-- 2.3 Product Variations -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_price DECIMAL(10, 2),
    discount_active BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.product_variations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.product_variations TO anon, authenticated, service_role;

-- 2.4 Site Settings ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.site_settings TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.5 Payment Methods ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    account_number TEXT,
    account_name TEXT,
    qr_code_url TEXT,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.payment_methods TO anon, authenticated, service_role;

-- 2.6 Shipping Locations -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.shipping_locations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.shipping_locations TO anon, authenticated, service_role;

-- 2.7 Couriers -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tracking_url_template TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add sort_order if upgrading from older schema
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.couriers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.couriers TO anon, authenticated, service_role;

-- 2.8 Promo Codes --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.promo_codes TO anon, authenticated, service_role;

-- 2.9 Orders -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    contact_method TEXT DEFAULT 'phone',
    shipping_address TEXT NOT NULL,
    shipping_city TEXT,
    shipping_state TEXT,
    shipping_zip_code TEXT,
    shipping_country TEXT DEFAULT 'Philippines',
    shipping_barangay TEXT,
    shipping_region TEXT,
    shipping_location TEXT,
    courier_id UUID,
    shipping_fee DECIMAL(10, 2) DEFAULT 0,
    order_items JSONB NOT NULL,
    subtotal DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    pricing_mode TEXT DEFAULT 'PHP',
    payment_method_id TEXT,
    payment_method_name TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_proof_url TEXT,
    promo_code_id UUID REFERENCES public.promo_codes(id),
    promo_code TEXT,
    discount_applied DECIMAL(10, 2) DEFAULT 0,
    order_status TEXT DEFAULT 'new',
    notes TEXT,
    admin_notes TEXT,
    tracking_number TEXT,
    tracking_courier TEXT,
    shipping_provider TEXT,
    shipping_note TEXT,
    shipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.10 COA Reports -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coa_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    batch TEXT,
    test_date DATE NOT NULL,
    purity_percentage DECIMAL(5,3) NOT NULL,
    quantity TEXT NOT NULL,
    task_number TEXT NOT NULL,
    verification_key TEXT NOT NULL,
    image_url TEXT NOT NULL,
    featured BOOLEAN DEFAULT false,
    manufacturer TEXT DEFAULT 'Peptide Pulse',
    laboratory TEXT DEFAULT 'Janoshik Analytical',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.coa_reports DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.coa_reports TO anon, authenticated, service_role;

-- 2.11 FAQs --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    order_index INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.faqs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.faqs TO anon, authenticated, service_role;

-- 2.12 Guide Topics (Articles) -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guide_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    preview TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    author TEXT DEFAULT 'Pepbabe Team',
    published_date TEXT DEFAULT CURRENT_DATE::TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guide_topics_display_order ON public.guide_topics(display_order);
CREATE INDEX IF NOT EXISTS idx_guide_topics_enabled ON public.guide_topics(is_enabled);
ALTER TABLE public.guide_topics DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.guide_topics TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS update_guide_topics_timestamp ON public.guide_topics;
CREATE TRIGGER update_guide_topics_timestamp
    BEFORE UPDATE ON public.guide_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.13 Protocols ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    notes TEXT[] DEFAULT '{}',
    storage TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.protocols DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.protocols TO anon, authenticated, service_role;

-- 2.14 Reviews -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    content TEXT,
    image_url TEXT,
    review_type TEXT NOT NULL DEFAULT 'testimonial'
        CHECK (review_type IN ('testimonial', 'result_photo')),
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.reviews TO anon, authenticated, service_role;

-- 2.15 Review ↔ Product link ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    UNIQUE (review_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_review_products_review_id ON public.review_products(review_id);
CREATE INDEX IF NOT EXISTS idx_review_products_product_id ON public.review_products(product_id);
ALTER TABLE public.review_products DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.review_products TO anon, authenticated, service_role;

-- ============================================================================
-- 3. STORAGE BUCKETS
-- ============================================================================
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('payment-proofs', 'payment-proofs', true, 10485760,
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('product-images', 'product-images', true, 5242880,
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('article-covers', 'article-covers', true, 5242880,
            ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('menu-images', 'menu-images', true, 5242880,
            ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Permissive storage object policies (admin is gated on the frontend)
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
CREATE POLICY "Public Select" ON storage.objects FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE TO public USING (true);

-- ============================================================================
-- 4. SEED DATA
-- ============================================================================

-- 4.1 Site Settings ------------------------------------------------------------
INSERT INTO public.site_settings (id, value, type, description) VALUES
('site_name', 'Pepbabe', 'text', 'The name of the website'),
('site_logo', '/assets/logo.jpeg', 'image', 'The logo image URL for the site'),
('site_description', 'Premium Peptide Solutions', 'text', 'Short description of the site'),
('currency', '₱', 'text', 'Currency symbol for prices'),
('hero_title_prefix', 'Premium', 'text', 'Hero title prefix'),
('hero_title_highlight', 'Peptides', 'text', 'Hero title highlighted word'),
('hero_title_suffix', '& Essentials', 'text', 'Hero title suffix'),
('coa_page_enabled', 'true', 'boolean', 'Enable/disable the COA page')
ON CONFLICT (id) DO NOTHING;

-- 4.2 Categories ---------------------------------------------------------------
INSERT INTO public.categories (id, name, sort_order, icon, active) VALUES
('c0a80121-0001-4e78-94f8-585d77059001', 'Peptides', 1, 'FlaskConical', true),
('c0a80121-0002-4e78-94f8-585d77059002', 'Box Only', 2, 'Package',      true)
ON CONFLICT (id) DO NOTHING;

-- 4.3 Couriers -----------------------------------------------------------------
INSERT INTO public.couriers (code, name, tracking_url_template, is_active, sort_order) VALUES
('lbc',      'LBC Express', 'https://www.lbcexpress.com/track/?tracking_no={tracking}', true, 1),
('jnt',      'J&T Express', 'https://www.jtexpress.ph/index/query/gzquery.html?bills={tracking}', true, 2),
('lalamove', 'Lalamove',    NULL, true, 3),
('grab',     'Grab Express', NULL, true, 4),
('maxim',    'Maxim',       NULL, true, 5)
ON CONFLICT (code) DO NOTHING;

-- 4.4 Shipping Rates -----------------------------------------------------------
DELETE FROM public.shipping_locations WHERE id IN ('NCR', 'LUZON', 'VISAYAS_MINDANAO');

INSERT INTO public.shipping_locations (id, name, fee, is_active, order_index) VALUES
('LBC_METRO_MANILA',  'LBC - Metro Manila',                 150.00, true, 1),
('LBC_LUZON',         'LBC - Luzon (Provincial)',           200.00, true, 2),
('LBC_VISMIN',        'LBC - Visayas & Mindanao',           250.00, true, 3),
('JNT_METRO_MANILA',  'J&T - Metro Manila',                 120.00, true, 4),
('JNT_PROVINCIAL',    'J&T - Provincial',                   180.00, true, 5),
('LALAMOVE_STANDARD', 'Lalamove (Book Yourself / Rider)',     0.00, true, 6),
('MAXIM_STANDARD',    'Maxim (Book Yourself / Rider)',        0.00, true, 7)
ON CONFLICT (id) DO UPDATE SET fee = EXCLUDED.fee;

-- 4.5 Payment Methods ----------------------------------------------------------
INSERT INTO public.payment_methods (id, name, account_number, account_name, active, sort_order) VALUES
('0a0b0001-0001-4e78-94f8-585d77059001', 'GCash',         '', 'Pepbabe', true, 1),
('0a0b0002-0002-4e78-94f8-585d77059002', 'BDO',           '', 'Pepbabe', true, 2),
('0a0b0003-0003-4e78-94f8-585d77059003', 'Security Bank', '', 'Pepbabe', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 4.6 Products (Pepbabe pricelist) --------------------------------------------
ALTER TABLE public.product_variations ALTER COLUMN quantity_mg SET DEFAULT 0;

DO $$
DECLARE
    peptides_cat TEXT := 'c0a80121-0001-4e78-94f8-585d77059001';
    box_cat      TEXT := 'c0a80121-0002-4e78-94f8-585d77059002';
    kit_inclusions TEXT[] := ARRAY['6 Insulin Syringes', '1 Recon Syringe', 'Bac Water', 'Alcohol Pads'];
    gluta_inclusions TEXT[] := ARRAY['15 Insulin Syringes (subq)', '1 Recon Syringe', 'Bac Water', 'Alcohol Pads'];
    box_inclusions TEXT[] := ARRAY['No syringes included'];

    tirz_id   UUID;
    ghkcu_id  UUID;
    nad_id    UUID;
    tesam_id  UUID;
    kpv_id    UUID;
    aod_id    UUID;
    amino_id  UUID;
    motsc_id  UUID;
    cagri_id  UUID;
    lipob12_id UUID;
    gluta_id  UUID;
    fatb_id   UUID;
    lemon_id  UUID;
    aqualyx_id UUID;
BEGIN
    -- ============================
    -- PEPTIDES (Per Kit)
    -- ============================

    -- Tirzepatide (parent + 3 variations)
    INSERT INTO public.products (name, description, category, base_price, available, featured, stock_quantity, inclusions)
    VALUES ('Tirzepatide',
            'Dual GIP/GLP-1 receptor agonist for effective weight management. Each kit includes mixing supplies.',
            peptides_cat, 1500.00, true, true, 50, kit_inclusions)
    RETURNING id INTO tirz_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
        (tirz_id, 'Tirz 15mg', 15, 1500.00, 50),
        (tirz_id, 'Tirz 30mg', 30, 2500.00, 50),
        (tirz_id, 'Tirz 60mg', 60, 4500.00, 50);

    -- GHK-CU (parent + 2 variations)
    INSERT INTO public.products (name, description, category, base_price, available, featured, stock_quantity, inclusions)
    VALUES ('GHK-CU',
            'Copper peptide for skin rejuvenation, collagen synthesis, and anti-aging benefits.',
            peptides_cat, 1300.00, true, true, 50, kit_inclusions)
    RETURNING id INTO ghkcu_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
        (ghkcu_id, 'GHK-CU 50mg',  50,  1300.00, 50),
        (ghkcu_id, 'GHK-CU 100mg', 100, 1800.00, 50);

    -- NAD+ 500mg
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('NAD+ 500mg',
            'Nicotinamide adenine dinucleotide for cellular energy, DNA repair, and longevity support.',
            peptides_cat, 1800.00, true, 50, kit_inclusions)
    RETURNING id INTO nad_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (nad_id, 'NAD+ 500mg', 500, 1800.00, 50);

    -- Tesamorelin 5mg
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Tesamorelin 5mg',
            'Growth hormone-releasing factor analogue for body composition and visceral fat reduction.',
            peptides_cat, 1300.00, true, 50, kit_inclusions)
    RETURNING id INTO tesam_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (tesam_id, 'Tesamorelin 5mg', 5, 1300.00, 50);

    -- KPV 10mg (NOT AVAILABLE)
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('KPV 10mg',
            'Anti-inflammatory tripeptide for skin health, gut healing, and immune modulation.',
            peptides_cat, 1500.00, false, 0, kit_inclusions)
    RETURNING id INTO kpv_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (kpv_id, 'KPV 10mg', 10, 1500.00, 0);

    -- AOD-9604
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('AOD-9604',
            'Anti-obesity peptide fragment derived from human growth hormone for fat metabolism.',
            peptides_cat, 1800.00, true, 50, kit_inclusions)
    RETURNING id INTO aod_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (aod_id, 'AOD-9604', 0, 1800.00, 50);

    -- 5-Amino
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('5-Amino',
            'NNMT inhibitor for metabolic enhancement, fat cell reduction, and cellular energy optimization.',
            peptides_cat, 1400.00, true, 50, kit_inclusions)
    RETURNING id INTO amino_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (amino_id, '5-Amino', 0, 1400.00, 50);

    -- Mots-c
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Mots-c',
            'Mitochondrial-derived peptide for metabolic optimization, fat oxidation, and cellular health.',
            peptides_cat, 1500.00, true, 50, kit_inclusions)
    RETURNING id INTO motsc_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (motsc_id, 'Mots-c', 0, 1500.00, 50);

    -- Cagrilintide 10mg
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Cagrilintide 10mg',
            'Next-generation amylin analogue for appetite regulation and metabolic support.',
            peptides_cat, 2200.00, true, 50, kit_inclusions)
    RETURNING id INTO cagri_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (cagri_id, 'Cagrilintide 10mg', 10, 2200.00, 50);

    -- Lipo-C with B12
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Lipo-C with B12',
            'Lipotropic Vitamin C and B12 blend for fat metabolism, energy, and overall vitality.',
            peptides_cat, 1500.00, true, 50, kit_inclusions)
    RETURNING id INTO lipob12_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (lipob12_id, 'Lipo-C with B12', 0, 1500.00, 50);

    -- Glutathione 1500mg (uses 15 syringes subq, not standard kit)
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Glutathione 1500mg',
            'Master antioxidant peptide for skin brightening, detoxification, and immune support. Includes 15 insulin syringes for subcutaneous use.',
            peptides_cat, 1800.00, true, 50, gluta_inclusions)
    RETURNING id INTO gluta_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (gluta_id, 'Glutathione 1500mg', 1500, 1800.00, 50);

    -- Fat blaster (NOT AVAILABLE)
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Fat blaster',
            'Advanced lipotropic fat-burning blend for enhanced body composition and metabolic support.',
            peptides_cat, 1700.00, false, 0, kit_inclusions)
    RETURNING id INTO fatb_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (fatb_id, 'Fat blaster', 0, 1700.00, 0);

    -- ============================
    -- BOX ONLY (no syringes included)
    -- ============================

    -- Lemon Bottle (5 vials)
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Lemon Bottle',
            'Lipolytic injection solution. Box of 5 vials. No syringes included.',
            box_cat, 4800.00, true, 30, box_inclusions)
    RETURNING id INTO lemon_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (lemon_id, 'Lemon Bottle (5 vials)', 0, 4800.00, 30);

    -- Aqualyx (10 vials) (NOT AVAILABLE)
    INSERT INTO public.products (name, description, category, base_price, available, stock_quantity, inclusions)
    VALUES ('Aqualyx',
            'Lipolytic injection solution for localised fat reduction. Box of 10 vials. No syringes included.',
            box_cat, 3000.00, false, 0, box_inclusions)
    RETURNING id INTO aqualyx_id;
    INSERT INTO public.product_variations (product_id, name, quantity_mg, price, stock_quantity)
    VALUES (aqualyx_id, 'Aqualyx (10 vials)', 0, 3000.00, 0);
END $$;

-- 4.8 Default Protocols --------------------------------------------------------
INSERT INTO public.protocols (name, category, dosage, frequency, duration, notes, storage, sort_order) VALUES
('Tirzepatide', 'Weight Management',
 'Start: 2.5mg → Maintenance: 5-15mg', 'Once weekly (same day each week)', '12-16 weeks per cycle',
 ARRAY['Start with lowest dose and titrate up every 4 weeks','Inject subcutaneously in abdomen, thigh, or upper arm','Rotate injection sites to prevent lipodystrophy','Take with or without food','Stay hydrated and eat protein-rich meals'],
 'Refrigerate at 2-8°C. Once reconstituted, use within 28 days.', 1),
('GHK-Cu (Copper Peptide)', 'Skin & Anti-Aging',
 '1-2mg per day', 'Daily or 5 days on, 2 days off', '8-12 weeks',
 ARRAY['Can be used topically or via subcutaneous injection','For topical: mix with carrier serum','Subcutaneous: inject in fatty tissue areas','Best results when combined with consistent skincare routine','Monitor for any skin sensitivity'],
 'Store powder at -20°C. Reconstituted: refrigerate, use within 14 days.', 2),
('BPC-157', 'Recovery & Healing',
 '250-500mcg per day', 'Daily, split into 1-2 doses', '4-8 weeks',
 ARRAY['Inject near injury site for localized healing','Can be taken orally for gut-related issues','Subcutaneous injection for systemic effects','Often stacked with TB-500 for enhanced healing','No known significant side effects at recommended doses'],
 'Store powder at -20°C. Reconstituted: refrigerate, use within 21 days.', 3),
('Semax', 'Cognitive Enhancement',
 '200-600mcg per day', 'Daily, preferably in the morning', '2-4 weeks on, 1-2 weeks off',
 ARRAY['Administered intranasally (nasal spray)','Best taken on empty stomach','Effects may be felt within 30 minutes','Cycle to prevent tolerance','Can be stacked with Selank for anxiety relief'],
 'Refrigerate. Nasal spray stable for 30 days at room temperature once opened.', 4),
('Selank', 'Anxiety & Mood',
 '250-500mcg per day', 'Daily or as needed', '2-4 weeks on, 1-2 weeks off',
 ARRAY['Administered intranasally','Calming effects without sedation','Can be combined with Semax','No known addiction potential','Best for situational anxiety or daily stress management'],
 'Refrigerate. Stable at room temperature for short periods.', 5),
('NAD+', 'Longevity & Energy',
 '100-500mg per session', '1-3 times per week', 'Ongoing or as cycles of 4-8 weeks',
 ARRAY['Subcutaneous or intramuscular injection','May cause flushing, nausea at higher doses','Start low and increase gradually','Best combined with healthy lifestyle habits','IV administration available at clinics for higher doses'],
 'Refrigerate. Protect from light. Use within 14 days of reconstitution.', 6),
('MOTS-C', 'Metabolic Health',
 '5-10mg per week', '2-3 times per week', '8-12 weeks',
 ARRAY['Subcutaneous injection','Supports exercise performance and recovery','May improve insulin sensitivity','Best taken before or after exercise','Works synergistically with regular physical activity'],
 'Store at -20°C. Reconstituted: refrigerate, use within 14 days.', 7)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. RPC FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_order_details(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'customer_email', o.customer_email,
        'customer_phone', o.customer_phone,
        'shipping_address', o.shipping_address,
        'shipping_city', o.shipping_city,
        'shipping_fee', o.shipping_fee,
        'total_price', o.total_price,
        'discount_applied', o.discount_applied,
        'promo_code', o.promo_code,
        'payment_status', o.payment_status,
        'order_status', o.order_status,
        'created_at', o.created_at,
        'items', o.order_items,
        'tracking_number', o.tracking_number,
        'shipping_provider', o.shipping_provider,
        'courier_code', c.code,
        'courier_name', c.name,
        'tracking_url_template', c.tracking_url_template
    ) INTO result
    FROM public.orders o
    LEFT JOIN public.couriers c ON o.courier_id = c.id
    WHERE o.id = p_order_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. REALTIME (so admin pages auto-update)
-- ============================================================================
DO $$
BEGIN
    PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
    IF FOUND THEN
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products;          EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variations; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;        EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;            EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;          EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_locations; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;   EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;     EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_codes;       EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coa_reports;       EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.faqs;              EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.guide_topics;      EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.protocols;         EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;           EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.review_products;   EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
END $$;

-- ============================================================================
-- 7. RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
