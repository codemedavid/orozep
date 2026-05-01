-- =============================================================================
-- Complete Database Migration
-- Project: Peptide Pulse / Orozep Website
-- Generated: 2026-05-01
-- Source: Supabase project ycilxwxsflbpggtkeynm (public schema)
--
-- This single file recreates the full public schema (tables, indexes, foreign
-- keys, RLS policies) and seeds it with all current data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Drop existing objects (safe re-run)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.review_products CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.protocols CASCADE;
DROP TABLE IF EXISTS public.product_variations CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.promo_codes CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.shipping_locations CASCADE;
DROP TABLE IF EXISTS public.couriers CASCADE;
DROP TABLE IF EXISTS public.coa_reports CASCADE;
DROP TABLE IF EXISTS public.faqs CASCADE;
DROP TABLE IF EXISTS public.guide_topics CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category text DEFAULT 'Uncategorized',
    base_price numeric NOT NULL DEFAULT 0,
    discount_price numeric,
    discount_start_date timestamptz,
    discount_end_date timestamptz,
    discount_active boolean DEFAULT false,
    purity_percentage numeric DEFAULT 99.0,
    molecular_weight text,
    cas_number text,
    sequence text,
    storage_conditions text DEFAULT 'Store at -20°C',
    inclusions text[],
    stock_quantity integer DEFAULT 0,
    available boolean DEFAULT true,
    featured boolean DEFAULT false,
    image_url text,
    safety_sheet_url text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------------
-- product_variations
-- ---------------------------------------------------------------------------
CREATE TABLE public.product_variations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    name text NOT NULL,
    quantity_mg numeric NOT NULL DEFAULT 0,
    price numeric NOT NULL DEFAULT 0,
    discount_price numeric,
    discount_active boolean DEFAULT false,
    stock_quantity integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.site_settings (
    id text PRIMARY KEY,
    value text NOT NULL,
    type text NOT NULL DEFAULT 'text',
    description text,
    updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- payment_methods
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    account_number text,
    account_name text,
    qr_code_url text,
    active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------------
-- shipping_locations
-- ---------------------------------------------------------------------------
CREATE TABLE public.shipping_locations (
    id text PRIMARY KEY,
    name text NOT NULL,
    fee numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    order_index integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX shipping_locations_order_idx ON public.shipping_locations (order_index);

-- ---------------------------------------------------------------------------
-- couriers
-- ---------------------------------------------------------------------------
CREATE TABLE public.couriers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    tracking_url_template text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    sort_order integer DEFAULT 0
);
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access to couriers" ON public.couriers
    FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- promo_codes
-- ---------------------------------------------------------------------------
CREATE TABLE public.promo_codes (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
    discount_value numeric NOT NULL,
    min_purchase_amount numeric DEFAULT 0,
    max_discount_amount numeric,
    start_date timestamptz,
    end_date timestamptz,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    contact_method text DEFAULT 'phone',
    shipping_address text NOT NULL,
    shipping_city text,
    shipping_state text,
    shipping_zip_code text,
    shipping_country text DEFAULT 'Philippines',
    shipping_barangay text,
    shipping_region text,
    shipping_location text,
    courier_id uuid,
    shipping_fee numeric DEFAULT 0,
    order_items jsonb NOT NULL,
    subtotal numeric,
    total_price numeric NOT NULL,
    pricing_mode text DEFAULT 'PHP',
    payment_method_id text,
    payment_method_name text,
    payment_status text DEFAULT 'pending',
    payment_proof_url text,
    promo_code_id uuid REFERENCES public.promo_codes(id),
    promo_code text,
    discount_applied numeric DEFAULT 0,
    order_status text DEFAULT 'new',
    notes text,
    admin_notes text,
    tracking_number text,
    tracking_courier text,
    shipping_provider text,
    shipping_note text,
    shipped_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    order_number text
);
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX idx_orders_order_status ON public.orders (order_status);

-- ---------------------------------------------------------------------------
-- coa_reports
-- ---------------------------------------------------------------------------
CREATE TABLE public.coa_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name text NOT NULL,
    batch text,
    test_date date NOT NULL,
    purity_percentage numeric NOT NULL,
    quantity text NOT NULL,
    task_number text NOT NULL,
    verification_key text NOT NULL,
    image_url text NOT NULL,
    featured boolean DEFAULT false,
    manufacturer text DEFAULT 'Peptide Pulse',
    laboratory text DEFAULT 'Janoshik Analytical',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- faqs
-- ---------------------------------------------------------------------------
CREATE TABLE public.faqs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question text NOT NULL,
    answer text NOT NULL,
    category text NOT NULL DEFAULT 'GENERAL',
    order_index integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- protocols
-- ---------------------------------------------------------------------------
CREATE TABLE public.protocols (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL,
    dosage text NOT NULL,
    frequency text NOT NULL,
    duration text NOT NULL,
    notes text[] DEFAULT '{}'::text[],
    storage text NOT NULL,
    sort_order integer DEFAULT 0,
    active boolean DEFAULT true,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    content_type text NOT NULL DEFAULT 'text',
    file_url text
);
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active protocols" ON public.protocols
    FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage protocols" ON public.protocols
    FOR ALL USING (true);

-- ---------------------------------------------------------------------------
-- guide_topics
-- ---------------------------------------------------------------------------
CREATE TABLE public.guide_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    preview text,
    content text NOT NULL,
    cover_image text,
    author text DEFAULT 'Pepbabe Team',
    published_date text DEFAULT (CURRENT_DATE)::text,
    display_order integer NOT NULL DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_guide_topics_display_order ON public.guide_topics (display_order);
CREATE INDEX idx_guide_topics_enabled ON public.guide_topics (is_enabled);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    content text,
    image_url text,
    review_type text NOT NULL DEFAULT 'testimonial' CHECK (review_type = ANY (ARRAY['testimonial'::text, 'result_photo'::text])),
    featured boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- review_products
-- ---------------------------------------------------------------------------
CREATE TABLE public.review_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    UNIQUE (review_id, product_id)
);
CREATE INDEX idx_review_products_review_id ON public.review_products (review_id);
CREATE INDEX idx_review_products_product_id ON public.review_products (product_id);

-- =============================================================================
-- DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- categories (8 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (id, name, icon, sort_order, active) VALUES
('c0a80121-0001-4e78-94f8-585d77059001', 'Peptides',             'FlaskConical', 1, true),
('c0a80121-0002-4e78-94f8-585d77059002', 'Weight Management',    'Scale',        2, true),
('c0a80121-0003-4e78-94f8-585d77059003', 'Beauty & Anti-Aging',  'Sparkles',     3, true),
('c0a80121-0004-4e78-94f8-585d77059004', 'Wellness & Vitality',  'Heart',        4, true),
('c0a80121-0005-4e78-94f8-585d77059005', 'GLP-1 Agonists',       'Pill',         5, true),
('c0a80121-0006-4e78-94f8-585d77059006', 'Insulin Pens',         'Syringe',      6, true),
('c0a80121-0007-4e78-94f8-585d77059007', 'Accessories',          'Package',      7, true),
('c0a80121-0008-4e78-94f8-585d77059008', 'Bundles & Kits',       'Gift',         8, true);

-- ---------------------------------------------------------------------------
-- products (17 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.products (id, name, description, category, base_price, purity_percentage, storage_conditions, inclusions, stock_quantity, available, featured) VALUES
('a1a20001-0001-4e78-94f8-585d77059001', 'Tirzepatide 5mg',     'Lab tested for 99%+ purity.',                                                                                                              'c0a80121-0002-4e78-94f8-585d77059002', 1800, 99, 'Store at -20°C', NULL, 50, true, true),
('a1a20002-0002-4e78-94f8-585d77059002', 'Tirzepatide 10mg',    'Double-strength formulation.',                                                                                                             'c0a80121-0002-4e78-94f8-585d77059002', 3200, 99, 'Store at -20°C', NULL, 50, true, true),
('a1a20003-0003-4e78-94f8-585d77059003', 'Tirzepatide 15mg',    'High-potency formulation.',                                                                                                                'c0a80121-0002-4e78-94f8-585d77059002', 4500, 99, 'Store at -20°C', NULL, 50, true, true),
('b7cd7cb2-894b-489d-96ae-fc472d4f5cae', 'Tirzepatide',         'Dual GIP/GLP-1 receptor agonist for effective weight management. Each kit includes mixing supplies.',                                       'c0a80121-0001-4e78-94f8-585d77059001', 1500, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  true),
('c09a1a6a-ae21-4031-830b-54b67380565a', 'GHK-CU',              'Copper peptide for skin rejuvenation, collagen synthesis, and anti-aging benefits.',                                                       'c0a80121-0001-4e78-94f8-585d77059001', 1300, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  true),
('2991ebed-e158-4de2-be41-14cd2d4aab05', 'NAD+ 500mg',          'Nicotinamide adenine dinucleotide for cellular energy, DNA repair, and longevity support.',                                                'c0a80121-0001-4e78-94f8-585d77059001', 1800, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('1c957a75-1187-4491-b193-39c5933b9ba0', 'Tesamorelin 5mg',     'Growth hormone-releasing factor analogue for body composition and visceral fat reduction.',                                                'c0a80121-0001-4e78-94f8-585d77059001', 1300, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('b0fe2aec-bc74-458f-9920-81beeeb2e2b9', 'KPV 10mg',            'Anti-inflammatory tripeptide for skin health, gut healing, and immune modulation.',                                                         'c0a80121-0001-4e78-94f8-585d77059001', 1500, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         0,  false, false),
('915c29fc-8c2d-4c98-a50a-3946cba1c49f', 'AOD-9604',            'Anti-obesity peptide fragment derived from human growth hormone for fat metabolism.',                                                      'c0a80121-0001-4e78-94f8-585d77059001', 1800, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('f89d5f16-ddf7-4a60-b505-58de452b0484', '5-Amino',             'NNMT inhibitor for metabolic enhancement, fat cell reduction, and cellular energy optimization.',                                          'c0a80121-0001-4e78-94f8-585d77059001', 1400, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('14aa81b2-fefe-4b4c-be46-baf93290dab2', 'Mots-c',              'Mitochondrial-derived peptide for metabolic optimization, fat oxidation, and cellular health.',                                            'c0a80121-0001-4e78-94f8-585d77059001', 1500, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('baef3f8b-f87c-42c5-9495-3e0b840c1809', 'Cagrilintide 10mg',   'Next-generation amylin analogue for appetite regulation and metabolic support.',                                                            'c0a80121-0001-4e78-94f8-585d77059001', 2200, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('02a30ee3-4c84-443b-85dc-c9ae72280775', 'Lipo-C with B12',     'Lipotropic Vitamin C and B12 blend for fat metabolism, energy, and overall vitality.',                                                     'c0a80121-0001-4e78-94f8-585d77059001', 1500, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         50, true,  false),
('b0f84d70-856e-4752-ad64-0c701aec9911', 'Glutathione 1500mg',  'Master antioxidant peptide for skin brightening, detoxification, and immune support. Includes 15 insulin syringes for subcutaneous use.',  'c0a80121-0001-4e78-94f8-585d77059001', 1800, 99, 'Store at -20°C', ARRAY['15 Insulin Syringes (subq)','1 Recon Syringe','Bac Water','Alcohol Pads'], 50, true,  false),
('7fe7449b-c4dc-4aed-83e5-51eed3fb630a', 'Fat blaster',         'Advanced lipotropic fat-burning blend for enhanced body composition and metabolic support.',                                                'c0a80121-0001-4e78-94f8-585d77059001', 1700, 99, 'Store at -20°C', ARRAY['6 Insulin Syringes','1 Recon Syringe','Bac Water','Alcohol Pads'],         0,  false, false),
('3e3de36a-3b87-4c27-8ace-5b0c7853379b', 'Lemon Bottle',        'Lipolytic injection solution. Box of 5 vials. No syringes included.',                                                                       'c0a80121-0002-4e78-94f8-585d77059002', 4800, 99, 'Store at -20°C', ARRAY['No syringes included'], 30, true,  false),
('a11865df-69f8-4a79-9e02-ccc9414f89b9', 'Aqualyx',             'Lipolytic injection solution for localised fat reduction. Box of 10 vials. No syringes included.',                                          'c0a80121-0002-4e78-94f8-585d77059002', 3000, 99, 'Store at -20°C', ARRAY['No syringes included'], 0,  false, false);

-- ---------------------------------------------------------------------------
-- product_variations (21 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.product_variations (id, product_id, name, quantity_mg, price, discount_active, stock_quantity) VALUES
('86308e3e-f99f-42ec-af20-7fc9c03fed87', 'a1a20001-0001-4e78-94f8-585d77059001', 'Vials Only',              0,    1800, false, 50),
('f270da2a-4c7f-407c-88ab-fbfe4aaa4426', 'a1a20001-0001-4e78-94f8-585d77059001', 'Complete Set',            0,    2300, false, 30),
('6a8559d7-c949-4816-a851-8ff46fc1e0b8', 'a1a20002-0002-4e78-94f8-585d77059002', 'Vials Only',              0,    3200, false, 50),
('4a81aad2-681e-45e4-8560-0417a6c4fb86', 'a1a20002-0002-4e78-94f8-585d77059002', 'Complete Set',            0,    3700, false, 30),
('e1399e3e-2cbf-4ffb-9389-20de095b705b', 'b7cd7cb2-894b-489d-96ae-fc472d4f5cae', 'Tirz 15mg',               15,   1500, false, 50),
('b58c68a9-d8f3-4985-bd01-036f87cb01fd', 'b7cd7cb2-894b-489d-96ae-fc472d4f5cae', 'Tirz 30mg',               30,   2500, false, 50),
('ef132165-ca6b-4ba1-8131-72f372fa8245', 'b7cd7cb2-894b-489d-96ae-fc472d4f5cae', 'Tirz 60mg',               60,   4500, false, 50),
('43245a60-f357-4bfb-a437-66ef878214a1', 'c09a1a6a-ae21-4031-830b-54b67380565a', 'GHK-CU 50mg',             50,   1300, false, 50),
('73d56bfc-702a-4617-991a-bffcc44b1c80', 'c09a1a6a-ae21-4031-830b-54b67380565a', 'GHK-CU 100mg',            100,  1800, false, 50),
('40abe873-83ac-4fda-bfb7-88f048f4ef77', '2991ebed-e158-4de2-be41-14cd2d4aab05', 'NAD+ 500mg',              500,  1800, false, 50),
('ad96d3e2-36d6-45c7-8b0c-c3d57512e457', '1c957a75-1187-4491-b193-39c5933b9ba0', 'Tesamorelin 5mg',         5,    1300, false, 50),
('a5bfefbf-974e-422a-b636-f20d03afe512', 'b0fe2aec-bc74-458f-9920-81beeeb2e2b9', 'KPV 10mg',                10,   1500, false, 0),
('d135efc2-10ed-45df-9880-e7897c5d6b0f', '915c29fc-8c2d-4c98-a50a-3946cba1c49f', 'AOD-9604',                0,    1800, false, 50),
('55357463-8304-44ed-9cde-121405d36e7a', 'f89d5f16-ddf7-4a60-b505-58de452b0484', '5-Amino',                 0,    1400, false, 50),
('8a2b3733-7ffb-41d1-8203-dae08f8dcf7b', '14aa81b2-fefe-4b4c-be46-baf93290dab2', 'Mots-c',                  0,    1500, false, 50),
('26cc5ae8-cf67-49c3-94fa-06fe951976b3', 'baef3f8b-f87c-42c5-9495-3e0b840c1809', 'Cagrilintide 10mg',       10,   2200, false, 50),
('ad0a2070-afe0-4282-a180-94221fcde1d1', '02a30ee3-4c84-443b-85dc-c9ae72280775', 'Lipo-C with B12',         0,    1500, false, 50),
('d0ba27d9-68e4-4661-9e66-865eba7e0871', 'b0f84d70-856e-4752-ad64-0c701aec9911', 'Glutathione 1500mg',      1500, 1800, false, 50),
('6a6892d1-e27b-4be3-b53f-956260cf4801', '7fe7449b-c4dc-4aed-83e5-51eed3fb630a', 'Fat blaster',             0,    1700, false, 0),
('5fdfad9e-7fcf-415c-80b1-aa3b34575fdc', '3e3de36a-3b87-4c27-8ace-5b0c7853379b', 'Lemon Bottle (5 vials)',  0,    4800, false, 30),
('26d9a5ce-d9b6-4545-87ec-81743a4c90c4', 'a11865df-69f8-4a79-9e02-ccc9414f89b9', 'Aqualyx (10 vials)',      0,    3000, false, 0);

-- ---------------------------------------------------------------------------
-- site_settings (8 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.site_settings (id, value, type, description) VALUES
('site_name',            'Peptide Pulse',            'text',    'The name of the website'),
('site_logo',             '/assets/logo.jpeg',       'image',   'The logo image URL for the site'),
('site_description',     'Premium Peptide Solutions','text',    'Short description of the site'),
('currency',             '₱',                        'text',    'Currency symbol for prices'),
('hero_title_prefix',    'Premium',                  'text',    'Hero title prefix'),
('hero_title_highlight', 'Peptides',                 'text',    'Hero title highlighted word'),
('hero_title_suffix',    '& Essentials',             'text',    'Hero title suffix'),
('coa_page_enabled',     'true',                     'boolean', 'Enable/disable the COA page');

-- ---------------------------------------------------------------------------
-- payment_methods (3 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.payment_methods (id, name, account_number, account_name, qr_code_url, active, sort_order) VALUES
('0a0b0001-0001-4e78-94f8-585d77059001', 'GCash',         '', 'Peptide Pulse', NULL, true, 1),
('0a0b0002-0002-4e78-94f8-585d77059002', 'BDO',           '', 'Peptide Pulse', NULL, true, 2),
('0a0b0003-0003-4e78-94f8-585d77059003', 'Security Bank', '', 'Peptide Pulse', NULL, true, 3);

-- ---------------------------------------------------------------------------
-- shipping_locations (7 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.shipping_locations (id, name, fee, is_active, order_index) VALUES
('LBC_METRO_MANILA',   'LBC - Metro Manila',                150, true, 1),
('LBC_LUZON',          'LBC - Luzon (Provincial)',          200, true, 2),
('LBC_VISMIN',         'LBC - Visayas & Mindanao',          250, true, 3),
('JNT_METRO_MANILA',   'J&T - Metro Manila',                120, true, 4),
('JNT_PROVINCIAL',     'J&T - Provincial',                  180, true, 5),
('LALAMOVE_STANDARD',  'Lalamove (Book Yourself / Rider)',  0,   true, 6),
('MAXIM_STANDARD',     'Maxim (Book Yourself / Rider)',     0,   true, 7);

-- ---------------------------------------------------------------------------
-- couriers (3 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.couriers (id, code, name, tracking_url_template, is_active, sort_order) VALUES
('0b049f97-b837-46a1-b2d2-6b3bc6fb01fe', 'lbc',      'LBC Express',  'https://www.lbcexpress.com/track/?tracking_no={tracking}',                  true, 0),
('c5fee3f2-ce61-4b6c-b6d1-ada92c09aa60', 'jnt',      'J&T Express',  'https://www.jtexpress.ph/index/query/gzquery.html?bills={tracking}',        true, 0),
('e6d4f82f-f6c7-4690-97d6-fce7c5c89b6f', 'lalamove', 'Lalamove',     NULL,                                                                          true, 0);

-- ---------------------------------------------------------------------------
-- protocols (33 rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.protocols (id, name, category, dosage, frequency, duration, notes, storage, sort_order, active, content_type) VALUES
('f3ad6d1f-7230-480d-9fa4-65a657253e9f', 'Tirzepetide 15MG Protocol',                  'Weight Management',               '2.5mg - 7.5mg weekly (dose based on vial size)', 'Once weekly on the same day',                  '12-16 weeks per cycle',
 ARRAY['Start with 2.5mg for first 4 weeks','Increase by 2.5mg every 4 weeks as tolerated','This is the 15mg vial - yields multiple doses','Inject subcutaneously in abdomen, thigh, or upper arm','Take with or without food','Rotate injection sites'],
 'Refrigerate at 2-8°C. Once in use, can be kept at room temperature for up to 21 days.', 1, true, 'text'),
('b6f79266-e926-4746-bd2b-f4e9db0bddc4', 'Tirzepatide',                                 'Weight Management',               'Start: 2.5mg → Maintenance: 5-15mg',             'Once weekly (same day each week)',             '12-16 weeks per cycle',
 ARRAY['Start with lowest dose and titrate up every 4 weeks','Inject subcutaneously in abdomen, thigh, or upper arm','Rotate injection sites to prevent lipodystrophy','Take with or without food','Stay hydrated and eat protein-rich meals'],
 'Refrigerate at 2-8°C. Once reconstituted, use within 28 days.', 1, true, 'text'),
('6c2d8cb8-835c-45de-8b91-71900680c018', 'GHK-Cu (Copper Peptide)',                     'Skin & Anti-Aging',               '1-2mg per day',                                  'Daily or 5 days on, 2 days off',               '8-12 weeks',
 ARRAY['Can be used topically or via subcutaneous injection','For topical: mix with carrier serum','Subcutaneous: inject in fatty tissue areas','Best results when combined with consistent skincare routine','Monitor for any skin sensitivity'],
 'Store powder at -20°C. Reconstituted: refrigerate, use within 14 days.', 2, true, 'text'),
('b6d0dc61-0a25-4b13-8d4c-2743a5187a44', 'Tirzepetide 30MG Protocol',                  'Weight Management',               '5mg - 15mg weekly (higher dose vial)',           'Once weekly on the same day',                  '12-16 weeks per cycle',
 ARRAY['Start with 5mg for first 4 weeks if experienced','Increase by 2.5-5mg every 4 weeks as tolerated','Maximum dose is 15mg weekly','This larger vial offers more flexibility','Inject subcutaneously','May cause nausea initially - eat smaller meals'],
 'Refrigerate at 2-8°C.', 2, true, 'text'),
('22c39a59-f2a7-488d-98ac-fc4f026e3d27', 'BPC-157',                                     'Recovery & Healing',              '250-500mcg per day',                             'Daily, split into 1-2 doses',                  '4-8 weeks',
 ARRAY['Inject near injury site for localized healing','Can be taken orally for gut-related issues','Subcutaneous injection for systemic effects','Often stacked with TB-500 for enhanced healing','No known significant side effects at recommended doses'],
 'Store powder at -20°C. Reconstituted: refrigerate, use within 21 days.', 3, true, 'text'),
('a0daf105-11b9-4472-bb5f-596d8043b316', 'NAD+ 500MG Protocol',                         'Longevity & Anti-Aging',          '100mg - 250mg daily',                            'Once daily, preferably morning',               '8-12 weeks per cycle',
 ARRAY['Start with 100mg and increase gradually','Subcutaneous or intramuscular injection','Higher dose vial allows extended use','Take in morning to avoid sleep disruption','Supports cellular energy and repair','Some initial flushing is normal'],
 'Refrigerate after reconstitution. Protect from light.', 3, true, 'text'),
('c2afa64e-f534-4ce3-9402-f834e20d1982', 'Semax',                                       'Cognitive Enhancement',           '200-600mcg per day',                             'Daily, preferably in the morning',             '2-4 weeks on, 1-2 weeks off',
 ARRAY['Administered intranasally (nasal spray)','Best taken on empty stomach','Effects may be felt within 30 minutes','Cycle to prevent tolerance','Can be stacked with Selank for anxiety relief'],
 'Refrigerate. Nasal spray stable for 30 days at room temperature once opened.', 4, true, 'text'),
('8805b757-4f10-40ba-8156-4e526fb6a49b', 'GHK CU 50MG Protocol',                        'Beauty & Regeneration',           '1mg - 2mg daily',                                'Once daily',                                   '8-12 weeks per cycle',
 ARRAY['Can be used topically or via injection','Promotes collagen synthesis','Supports skin elasticity and wound healing','Also used for hair regrowth','Copper peptide with many benefits','Safe for long-term use'],
 'Refrigerate after reconstitution.', 4, true, 'text'),
('3166ef04-9f5b-4a47-b989-19032862fbaf', 'GHK CU 100MG Protocol',                       'Beauty & Regeneration',           '2mg - 3mg daily',                                'Once daily',                                   '8-12 weeks per cycle',
 ARRAY['Higher concentration for extended protocols','Excellent for anti-aging protocols','Can inject near treatment area','Supports tissue repair','Works synergistically with other peptides','Monitor for copper sensitivity'],
 'Refrigerate after reconstitution.', 5, true, 'text'),
('ea919797-520b-44fb-832a-ab3920ef32d7', 'Selank',                                      'Anxiety & Mood',                  '250-500mcg per day',                             'Daily or as needed',                           '2-4 weeks on, 1-2 weeks off',
 ARRAY['Administered intranasally','Calming effects without sedation','Can be combined with Semax','No known addiction potential','Best for situational anxiety or daily stress management'],
 'Refrigerate. Stable at room temperature for short periods.', 5, true, 'text'),
('b413981e-6b48-48ff-8d89-fefaf7f01856', 'NAD+',                                        'Longevity & Energy',              '100-500mg per session',                          '1-3 times per week',                           'Ongoing or as cycles of 4-8 weeks',
 ARRAY['Subcutaneous or intramuscular injection','May cause flushing, nausea at higher doses','Start low and increase gradually','Best combined with healthy lifestyle habits','IV administration available at clinics for higher doses'],
 'Refrigerate. Protect from light. Use within 14 days of reconstitution.', 6, true, 'text'),
('2853f9ac-8e39-488f-9496-2f58f945ca12', 'DSIP 5MG Protocol',                           'Sleep & Recovery',                '100mcg - 300mcg before bed',                     'Once daily, 30 min before sleep',              '2-4 weeks per cycle',
 ARRAY['Start with 100mcg to assess tolerance','Promotes deep, restorative sleep','Do not combine with other sedatives','Effects build over several days','Take 2-4 week breaks between cycles','Subcutaneous injection preferred'],
 'Refrigerate after reconstitution.', 6, true, 'text'),
('cfedf18e-d997-47a7-a022-81c1b4360537', 'MOTS-C',                                      'Metabolic Health',                '5-10mg per week',                                '2-3 times per week',                           '8-12 weeks',
 ARRAY['Subcutaneous injection','Supports exercise performance and recovery','May improve insulin sensitivity','Best taken before or after exercise','Works synergistically with regular physical activity'],
 'Store at -20°C. Reconstituted: refrigerate, use within 14 days.', 7, true, 'text'),
('bae398a8-3ad5-4b44-82ca-1a5ae0066705', 'DSIP 15MG Protocol',                          'Sleep & Recovery',                '200mcg - 400mcg before bed',                     'Once daily, 30 min before sleep',              '4-6 weeks per cycle',
 ARRAY['Larger vial for extended sleep support','Gradually increase dose as needed','Supports natural sleep architecture','May help with stress-related insomnia','Avoid alcohol when using','Take breaks to prevent tolerance'],
 'Refrigerate after reconstitution.', 7, true, 'text'),
('b33b5d04-2f30-46b2-931d-9b42bab04408', 'Glutathione 1500MG Protocol',                 'Detox & Skin Brightening',        '200mg - 500mg every other day',                  '3-4 times weekly',                             '8-12 weeks per cycle',
 ARRAY['Master antioxidant for detoxification','Skin brightening and evening tone','Can inject subcutaneously or intramuscularly','Often combined with Vitamin C','Supports liver function','Results visible after 4-6 weeks'],
 'Refrigerate. Protect from light and heat.', 8, true, 'text'),
('e319b2a1-c4e8-4f94-a32a-dd24e4014c79', 'Lipo C with B12 Protocol',                    'Fat Burning & Energy',            '1ml injection',                                  '2-3 times weekly',                             'Ongoing or 8-12 week cycles',
 ARRAY['Lipotropic injection for fat metabolism','Boosts energy and metabolism','Inject intramuscularly in thigh or buttock','Best combined with exercise program','Supports liver fat processing','B12 provides energy boost'],
 'Refrigerate. Protect from light.', 9, true, 'text'),
('f0cb0387-5f7d-4e7c-8ad8-e31cd756206b', 'SS31 10MG Protocol',                          'Mitochondrial Health',            '5mg - 10mg daily',                               'Once daily',                                   '4-6 weeks per cycle',
 ARRAY['Targets inner mitochondrial membrane','Protects against oxidative stress','Supports cellular energy production','Inject subcutaneously','Best taken in morning','Take 4-week breaks between cycles'],
 'Refrigerate. Protect from light.', 10, true, 'text'),
('4f4433c8-2e14-4942-8e0d-fa7cf620c3ea', 'SS31 50MG Protocol',                          'Mitochondrial Health',            '10mg - 20mg daily',                              'Once daily',                                   '4-8 weeks per cycle',
 ARRAY['Higher dose for intensive protocols','Advanced mitochondrial support','Anti-aging at cellular level','Monitor energy levels','May enhance exercise performance','Rotate injection sites'],
 'Refrigerate. Protect from light.', 11, true, 'text'),
('703781ff-1efa-4179-9b36-ec8016aac64c', 'MOTS C 10MG Protocol',                        'Metabolic Health',                '5mg twice weekly',                               'Twice weekly (e.g., Mon/Thu)',                 '8-12 weeks per cycle',
 ARRAY['Mitochondrial-derived peptide','Improves insulin sensitivity','Enhances exercise capacity','Take before exercise for best results','Supports metabolic health','Intramuscular or subcutaneous'],
 'Refrigerate after reconstitution.', 12, true, 'text'),
('a94799dc-05fc-4d30-8d19-b6969fad50c1', 'MOTS C 40MG Protocol',                        'Metabolic Health',                '10mg twice weekly',                              'Twice weekly (e.g., Mon/Thu)',                 '8-12 weeks per cycle',
 ARRAY['Higher dose for intensive protocols','Enhanced metabolic optimization','Great for athletes and active users','Best taken pre-workout','Supports weight management','Monitor blood glucose if diabetic'],
 'Refrigerate after reconstitution.', 13, true, 'text'),
('e8c67f4f-7759-474a-9329-38a64272a207', 'KLOW (CU50+TB10+BC10+KPV10) Protocol',        'Healing & Anti-Inflammatory',     'As pre-mixed or follow component ratios',        'Once daily',                                   '6-8 weeks per cycle',
 ARRAY['Powerful combination stack','GHK-Cu for regeneration','TB-500 for tissue repair','BPC-157 for healing','KPV for anti-inflammatory','All-in-one healing protocol'],
 'Refrigerate after reconstitution.', 14, true, 'text'),
('65006f81-0f25-4e19-989c-3b8f6658713e', 'Lemon Bottle 10MG Protocol',                  'Fat Dissolving',                  'Apply as directed to treatment area',            'Weekly treatments',                            '4-6 sessions typically',
 ARRAY['Lipolytic solution for fat reduction','Professional application recommended','Targets stubborn fat deposits','Massage after application','Results visible after 2-3 sessions','Avoid strenuous exercise 24hrs after'],
 'Refrigerate. Keep away from direct sunlight.', 15, true, 'text'),
('d53d232e-84c3-4d9d-83af-79a38e1992f6', 'KPV 10MG + GHKCu 50MG Protocol',              'Anti-Inflammatory & Regeneration','KPV: 200mcg + GHKCu: 1mg daily',                'Once daily',                                   '6-8 weeks per cycle',
 ARRAY['Synergistic anti-inflammatory combo','KPV reduces inflammation','GHKCu promotes tissue repair','Great for skin and gut health','Subcutaneous injection','Can split doses AM/PM'],
 'Refrigerate after reconstitution.', 16, true, 'text'),
('6c13d34c-7ba4-48a8-a9bf-5cb24d5bbf9c', 'Snap-8 (Botox in a Bottle) Protocol',         'Anti-Wrinkle',                    'Apply topically to wrinkle-prone areas',         'Twice daily',                                  'Ongoing use',
 ARRAY['Topical anti-wrinkle peptide','Apply to forehead, crows feet, frown lines','Works by relaxing facial muscles','Visible results in 2-4 weeks','Safe for daily use','Can layer under moisturizer'],
 'Store at room temperature. Keep sealed.', 17, true, 'text'),
('ac23ff7b-932d-4294-a340-c5d7d56dac95', 'GHKCu Cosmetic Grade (1 gram) Protocol',      'Professional Cosmetic Use',       'Mix into serums: 0.1-0.5% concentration',        'Daily as part of skincare routine',            'Ongoing use',
 ARRAY['High-grade copper peptide powder','Mix into your preferred serum base','Start with lower concentration','Store mixed serum in dark bottle','Promotes collagen and elastin','Professional skincare formulation'],
 'Store powder in freezer. Mixed serum refrigerate.', 18, true, 'text'),
('6f18cf46-7481-4973-9a82-667b762e03a8', 'Semax 10MG + Selank 10MG Protocol',           'Cognitive Enhancement',           'Semax: 300mcg + Selank: 250mcg daily',           '1-2 times daily',                              '2-4 weeks per cycle',
 ARRAY['Powerful nootropic combination','Semax for focus and memory','Selank for anxiety and stress','Intranasal or subcutaneous','Best taken morning/early afternoon','Take breaks between cycles'],
 'Refrigerate. Use within 30 days.', 19, true, 'text'),
('4ec50afc-1e6f-4b6a-b27f-4a90763312e9', 'KPV 5MG Protocol',                            'Anti-Inflammatory',               '100mcg - 200mcg daily',                          'Once daily',                                   '4-8 weeks per cycle',
 ARRAY['Potent anti-inflammatory peptide','Alpha-MSH fragment','Gut health and skin conditions','Subcutaneous injection','No significant side effects','Works systemically'],
 'Refrigerate after reconstitution.', 20, true, 'text'),
('52a99f8f-fbcc-42c8-ab01-88e1f3828105', 'KPV 10MG Protocol',                           'Anti-Inflammatory',               '200mcg - 400mcg daily',                          'Once or twice daily',                          '4-8 weeks per cycle',
 ARRAY['Higher dose for stronger effect','Excellent for inflammatory conditions','Can split dose morning/evening','Supports gut barrier function','Anti-microbial properties','Safe for extended use'],
 'Refrigerate after reconstitution.', 21, true, 'text'),
('e378f8d3-1f5d-44ea-a114-982508211ced', 'Tesamorelin 5MG Protocol',                    'Growth Hormone',                  '1mg daily',                                      'Once daily before bed on empty stomach',       '12-26 weeks per cycle',
 ARRAY['FDA-approved GHRH analog','Reduces visceral fat','Inject subcutaneously in abdomen','No food 2 hours before/after','Stimulates natural GH release','Monitor IGF-1 levels'],
 'Refrigerate at 2-8°C.', 22, true, 'text'),
('1795d2d9-b4f0-4070-949f-b40fde94a982', 'Tesamorelin 10MG Protocol',                   'Growth Hormone',                  '1mg - 2mg daily',                                'Once daily before bed on empty stomach',       '12-26 weeks per cycle',
 ARRAY['Larger vial for extended use','Same protocol as 5MG','Consistent timing important','Best taken before bed','Avoid eating after injection','Results visible after 8-12 weeks'],
 'Refrigerate at 2-8°C.', 23, true, 'text'),
('dc5c6f87-b3f6-4567-99ad-ac36c5691738', 'Epitalon 10MG Protocol',                      'Longevity & Anti-Aging',          '5mg - 10mg daily for 10-20 days',                'Once daily, preferably before bed',            '10-20 day cycles, 4-6 months apart',
 ARRAY['Telomere elongation peptide','Short intense cycles','Promotes melatonin production','Anti-aging at DNA level','Take 2-3 cycles per year','Subcutaneous injection'],
 'Refrigerate. Stable for 6 months.', 24, true, 'text'),
('7c114c49-d9f0-49ec-aa1a-6f5851060adb', 'Epitalon 50MG Protocol',                      'Longevity & Anti-Aging',          '10mg daily for 10-20 days',                      'Once daily, preferably before bed',            '10-20 day cycles, 4-6 months apart',
 ARRAY['Higher dose vial for multiple cycles','Ultimate longevity peptide','Resets biological clock','Improves sleep quality','Supports immune function','Visible anti-aging effects'],
 'Refrigerate. Stable for 6 months.', 25, true, 'text'),
('2a1401dd-d808-48aa-9bb2-c152a4b24887', 'PT141 10MG Protocol',                         'Sexual Wellness',                 '500mcg - 2mg as needed',                         'As needed, 1-2 hours before activity',         'Use as needed, 24hr minimum between doses',
 ARRAY['Also known as Bremelanotide','Start with 500mcg to assess tolerance','Effects last 24-72 hours','Inject subcutaneously 45min-2hrs before','May cause nausea initially','Maximum once per 24 hours'],
 'Refrigerate. Use within 30 days.', 26, true, 'text');

-- =============================================================================
-- End of migration
-- =============================================================================
