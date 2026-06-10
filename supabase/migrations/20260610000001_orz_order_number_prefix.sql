-- Switch order number prefix from BRC- to ORZ-.
UPDATE orders
SET order_number = 'ORZ-' || substring(order_number FROM 5)
WHERE order_number LIKE 'BRC-%';

CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORZ-' || nextval('order_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

-- Keep old BRC- numbers searchable: treat BRC-XXXX input as ORZ-XXXX.
DROP FUNCTION IF EXISTS get_order_details(text);

CREATE OR REPLACE FUNCTION get_order_details(order_id_input TEXT)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  order_status TEXT,
  payment_status TEXT,
  tracking_number TEXT,
  shipping_provider TEXT,
  shipping_note TEXT,
  total_price DECIMAL(10,2),
  shipping_fee DECIMAL(10,2),
  order_items JSONB,
  created_at TIMESTAMPTZ,
  promo_code TEXT,
  discount_applied DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.order_status,
    o.payment_status,
    o.tracking_number,
    o.shipping_provider,
    o.shipping_note,
    o.total_price,
    o.shipping_fee,
    o.order_items,
    o.created_at,
    o.promo_code,
    o.discount_applied
  FROM orders o
  WHERE
    o.order_number ILIKE order_id_input
    OR o.order_number ILIKE regexp_replace(order_id_input, '^BRC-', 'ORZ-', 'i')
    OR o.id::text ILIKE order_id_input || '%'
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_details(TEXT) TO public;
