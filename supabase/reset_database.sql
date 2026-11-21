-- ====================================================================
-- QUICK DATABASE RESET SCRIPT - TOY STALL POS SYSTEM
-- Project: luamazblgroduhlbvjip
-- Supabase SQL Editor: https://supabase.com/dashboard/project/luamazblgroduhlbvjip/sql/new
-- ====================================================================
-- Use this script whenever you want to:
-- 1. Wipe all test orders, payments, and order items
-- 2. Clear inventory deduction audit logs
-- 3. Reset the sequential token counter back to 0 (so next token is T001)
-- 4. Restore original stock levels for all 12 wholesale exhibition toys
-- ====================================================================

-- Step 1: Wipe transactional tables in proper foreign key order
DELETE FROM public.payments WHERE id IS NOT NULL;
DELETE FROM public.inventory_logs WHERE id IS NOT NULL;
DELETE FROM public.order_items WHERE id IS NOT NULL;
DELETE FROM public.orders WHERE id IS NOT NULL;

-- Step 2: Reset atomic token sequence to 0 (Next order will be T001)
INSERT INTO public.token_counter (counter_date, last_token_number, updated_at)
VALUES (CURRENT_DATE, 0, now())
ON CONFLICT (counter_date)
DO UPDATE SET
  last_token_number = 0,
  updated_at = now();

-- Step 3: Restore starting exhibition stock for all 25 official products
UPDATE public.products SET stock = 12, updated_at = now() WHERE barcode = '8902001'; -- Dumpling
UPDATE public.products SET stock = 30, updated_at = now() WHERE barcode = '8902002'; -- Rainbow spring
UPDATE public.products SET stock = 12, updated_at = now() WHERE barcode = '8902003'; -- Slime
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902004'; -- Spiderman
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902005'; -- Horror mask
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902006'; -- Snake
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902007'; -- Unicorn
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902008'; -- Flying boy
UPDATE public.products SET stock = 24, updated_at = now() WHERE barcode = '8902009'; -- Halloween
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902010'; -- Spinner (₹28)
UPDATE public.products SET stock = 5,  updated_at = now() WHERE barcode = '8902011'; -- Cube
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902012'; -- UNO card
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902013'; -- Gatling gun
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902014'; -- Keychain (₹58)
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902015'; -- Spinner (₹58)
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902016'; -- Keychain (₹68)
UPDATE public.products SET stock = 24, updated_at = now() WHERE barcode = '8902017'; -- Pressure slime
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902018'; -- Gun Orbeez
UPDATE public.products SET stock = 3,  updated_at = now() WHERE barcode = '8902019'; -- 2060 Grip
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902020'; -- Laser lite
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902021'; -- Camera
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902022'; -- Keychain (₹48)
UPDATE public.products SET stock = 20, updated_at = now() WHERE barcode = '8902023'; -- Metal car
UPDATE public.products SET stock = 3,  updated_at = now() WHERE barcode = '8902024'; -- Music Gun
UPDATE public.products SET stock = 10, updated_at = now() WHERE barcode = '8902025'; -- Candy Flower

-- Step 4: Ensure create_token_order handles >999 tokens without truncation
CREATE OR REPLACE FUNCTION public.create_token_order(
  p_items JSONB,
  p_counter_id TEXT DEFAULT 'Counter 1',
  p_notes TEXT DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_seq INTEGER;
  v_token_number TEXT;
  v_order_id UUID;
  v_item JSONB;
  v_total NUMERIC(10,2) := 0;
  v_count INTEGER := 0;
  v_subtotal NUMERIC(10,2);
  v_unit_price NUMERIC(10,2);
  v_qty INTEGER;
  v_prod_id UUID;
  v_prod_name TEXT;
  v_prod_image TEXT;
BEGIN
  -- Atomic increment of token counter using row-level locking
  INSERT INTO public.token_counter (counter_date, last_token_number, updated_at)
  VALUES (CURRENT_DATE, 1, now())
  ON CONFLICT (counter_date)
  DO UPDATE SET
    last_token_number = public.token_counter.last_token_number + 1,
    updated_at = now()
  RETURNING last_token_number INTO v_next_seq;

  -- Format token as 'T' + 3 digits (e.g. T001, T021, T999, T1000) WITHOUT truncation
  v_token_number := 'T' || CASE 
    WHEN v_next_seq < 1000 THEN LPAD(v_next_seq::TEXT, 3, '0') 
    ELSE v_next_seq::TEXT 
  END;

  -- Calculate order total and items count
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_subtotal := v_qty * v_unit_price;
    v_total := v_total + v_subtotal;
    v_count := v_count + v_qty;
  END LOOP;

  -- Insert into orders
  INSERT INTO public.orders (
    token_number, token_sequence, status, subtotal, discount, tax,
    total_amount, items_count, counter_id, created_by_staff_id, notes, created_at, updated_at
  )
  VALUES (
    v_token_number, v_next_seq, 'NEW', v_total, 0, 0,
    v_total, v_count, COALESCE(p_counter_id, 'Counter 1'), p_staff_id, p_notes, now(), now()
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_prod_name := (v_item->>'product_name')::TEXT;
    v_prod_image := (v_item->>'image')::TEXT;
    v_subtotal := v_qty * v_unit_price;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, image)
    VALUES (v_order_id, v_prod_id, v_prod_name, v_unit_price, v_qty, v_subtotal, v_prod_image);
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'token_number', v_token_number,
    'token_sequence', v_next_seq,
    'status', 'NEW',
    'total_amount', v_total,
    'items_count', v_count,
    'created_at', now()
  );
END;
$$;

-- Step 5: Update reset_exhibition_data() function
CREATE OR REPLACE FUNCTION public.reset_exhibition_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.payments WHERE id IS NOT NULL;
  DELETE FROM public.inventory_logs WHERE reason = 'ORDER_COMPLETED' OR id IS NOT NULL;
  DELETE FROM public.order_items WHERE id IS NOT NULL;
  DELETE FROM public.orders WHERE id IS NOT NULL;
  UPDATE public.token_counter SET last_token_number = 0, updated_at = now() WHERE counter_date IS NOT NULL;

  UPDATE public.products SET stock = 60, updated_at = now() WHERE barcode = '8901001';
  UPDATE public.products SET stock = 50, updated_at = now() WHERE barcode = '8901002';
  UPDATE public.products SET stock = 45, updated_at = now() WHERE barcode = '8901003';
  UPDATE public.products SET stock = 80, updated_at = now() WHERE barcode = '8901004';
  UPDATE public.products SET stock = 65, updated_at = now() WHERE barcode = '8901005';
  UPDATE public.products SET stock = 65, updated_at = now() WHERE barcode = '8901006';
  UPDATE public.products SET stock = 30, updated_at = now() WHERE barcode = '8901007';
  UPDATE public.products SET stock = 40, updated_at = now() WHERE barcode = '8901008';
  UPDATE public.products SET stock = 35, updated_at = now() WHERE barcode = '8901009';
  UPDATE public.products SET stock = 50, updated_at = now() WHERE barcode = '8901010';
  UPDATE public.products SET stock = 70, updated_at = now() WHERE barcode = '8901011';
  UPDATE public.products SET stock = 35, updated_at = now() WHERE barcode = '8901012';
END;
$$;

-- Step 6: Verification Output
SELECT
  (SELECT count(*) FROM public.orders) AS remaining_orders,
  (SELECT count(*) FROM public.payments) AS remaining_payments,
  (SELECT count(*) FROM public.order_items) AS remaining_items,
  (SELECT count(*) FROM public.inventory_logs) AS remaining_logs,
  (SELECT last_token_number FROM public.token_counter WHERE counter_date = CURRENT_DATE) AS current_last_token,
  (SELECT count(*) FROM public.products) AS total_products;
