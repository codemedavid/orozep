-- Sequence for order numbers; start at 10000 so new numbers (5 digits)
-- can never collide with the old random 4-digit ones.
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 10000;

-- Renumber the later orders in each duplicate group (keep the earliest).
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY order_number ORDER BY created_at, id) AS rn
  FROM orders
  WHERE order_number IS NOT NULL
)
UPDATE orders o
SET order_number = 'BRC-' || nextval('order_number_seq')
FROM ranked r
WHERE o.id = r.id AND r.rn > 1;

-- Assign numbers to any orders missing one.
UPDATE orders
SET order_number = 'BRC-' || nextval('order_number_seq')
WHERE order_number IS NULL;

-- Trigger: DB assigns the order number on insert (ignores client-supplied nulls).
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'BRC-' || nextval('order_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_order_number();

-- Enforce uniqueness from now on.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number ON orders(order_number);
