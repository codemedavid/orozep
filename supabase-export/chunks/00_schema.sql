-- ============================================================
--  Orozep / Supabase full export
--  Generated: 2026-05-26
--  Target: import into a fresh Supabase project (public schema)
--  Contents: schema DDL + all table data (INSERT statements)
--
--  NOTES:
--   * Run this whole file in the new project's SQL editor.
--   * RLS is intentionally NOT enabled here (original project had
--     it disabled on data tables). Add policies before going live.
--   * Requires pgcrypto for gen_random_uuid() (enabled by default
--     on Supabase).
-- ============================================================

-- ---------- SCHEMA ----------

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.products (
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
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.product_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  name text NOT NULL,
  quantity_mg numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  discount_price numeric,
  discount_active boolean DEFAULT false,
  stock_quantity integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY,
  value text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  description text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_number text,
  account_name text,
  qr_code_url text,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.shipping_locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  tracking_url_template text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS public.orders (
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

CREATE TABLE IF NOT EXISTS public.coa_reports (
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

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'GENERAL',
  order_index integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  notes text[] DEFAULT '{}',
  storage text NOT NULL,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  product_id uuid REFERENCES public.products(id),
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  content_type text NOT NULL DEFAULT 'text',
  file_url text
);

CREATE TABLE IF NOT EXISTS public.guide_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  preview text,
  content text NOT NULL,
  cover_image text,
  author text DEFAULT 'Pepbabe Team',
  published_date text DEFAULT (CURRENT_DATE)::text,
  display_order integer NOT NULL DEFAULT 0,
  is_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text,
  image_url text,
  review_type text NOT NULL DEFAULT 'testimonial' CHECK (review_type = ANY (ARRAY['testimonial'::text, 'result_photo'::text])),
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id),
  product_id uuid NOT NULL REFERENCES public.products(id)
);
