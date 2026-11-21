-- ====================================================================
-- PRODUCTION TOY STALL POS SYSTEM - COMPLETE SUPABASE SETUP
-- Project: luamazblgroduhlbvjip
-- Paste and run this entire file in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/luamazblgroduhlbvjip/sql/new
-- ====================================================================

-- 1. Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('inventory_staff', 'billing_staff', 'admin')),
  counter_id TEXT DEFAULT 'Counter 1',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CREATE PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- 4. CREATE ATOMIC TOKEN COUNTER TABLE
-- Guaranteed single-row counter per date with atomic row-level locks
CREATE TABLE IF NOT EXISTS public.token_counter (
  counter_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  last_token_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CREATE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number TEXT NOT NULL,
  token_sequence INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NEW', 'ACCEPTED', 'PAID', 'COMPLETED', 'VOID')) DEFAULT 'NEW',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  counter_id TEXT NOT NULL DEFAULT 'Counter 1',
  created_by_staff_id UUID REFERENCES auth.users(id),
  accepted_by_staff_id UUID REFERENCES auth.users(id),
  completed_by_staff_id UUID REFERENCES auth.users(id),
  notes TEXT,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_token_number ON public.orders(token_number);

-- 6. CREATE ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- 7. CREATE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'SPLIT', 'CARD')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  cash_tendered NUMERIC(10,2),
  change_returned NUMERIC(10,2),
  cash_amount NUMERIC(10,2) DEFAULT 0,
  upi_amount NUMERIC(10,2) DEFAULT 0,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  staff_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- 8. CREATE INVENTORY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  change_quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('ORDER_COMPLETED', 'RESTOCK', 'MANUAL_ADJUSTMENT', 'INITIAL_STOCK', 'DAMAGE_WASTE')),
  order_id UUID REFERENCES public.orders(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs(product_id);

-- ====================================================================
-- ATOMIC STORED PROCEDURES (RPCs)
-- ====================================================================

-- Function 1: Atomically generate sequential token & create order
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
  -- 1. Atomic increment of token counter using row-level locking
  INSERT INTO public.token_counter (counter_date, last_token_number, updated_at)
  VALUES (CURRENT_DATE, 1, now())
  ON CONFLICT (counter_date)
  DO UPDATE SET
    last_token_number = public.token_counter.last_token_number + 1,
    updated_at = now()
  RETURNING last_token_number INTO v_next_seq;

  -- 2. Format token as 'T' + 3 digits (e.g. T001, T021, T054, T999, T1000) WITHOUT truncation
  v_token_number := 'T' || CASE 
    WHEN v_next_seq < 1000 THEN LPAD(v_next_seq::TEXT, 3, '0') 
    ELSE v_next_seq::TEXT 
  END;

  -- 3. Calculate order total and items count from input json
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_subtotal := v_qty * v_unit_price;
    v_total := v_total + v_subtotal;
    v_count := v_count + v_qty;
  END LOOP;

  -- 4. Insert into orders table
  INSERT INTO public.orders (
    token_number,
    token_sequence,
    status,
    subtotal,
    discount,
    tax,
    total_amount,
    items_count,
    counter_id,
    created_by_staff_id,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    v_token_number,
    v_next_seq,
    'NEW',
    v_total,
    0,
    0,
    v_total,
    v_count,
    COALESCE(p_counter_id, 'Counter 1'),
    p_staff_id,
    p_notes,
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  -- 5. Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_prod_name := (v_item->>'product_name')::TEXT;
    v_prod_image := (v_item->>'image')::TEXT;
    v_subtotal := v_qty * v_unit_price;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      subtotal,
      image
    );
  END LOOP;

  -- 6. Return response object
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

-- Function 2: Enforce strict status transitions & deduct inventory upon COMPLETED
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_target_status TEXT,
  p_staff_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
  v_curr_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- 1. Fetch current order with row lock
  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- 2. Validate state machine transitions:
  IF v_current_status = 'COMPLETED' OR v_current_status = 'VOID' THEN
    RAISE EXCEPTION 'Order % is locked in status % and cannot be changed.', p_order_id, v_current_status;
  END IF;

  IF p_target_status = 'ACCEPTED' AND v_current_status != 'NEW' THEN
    RAISE EXCEPTION 'Invalid transition from % to ACCEPTED (Must be NEW)', v_current_status;
  END IF;

  IF p_target_status = 'PAID' AND v_current_status != 'ACCEPTED' THEN
    RAISE EXCEPTION 'Invalid transition from % to PAID (Must be ACCEPTED)', v_current_status;
  END IF;

  IF p_target_status = 'COMPLETED' AND v_current_status != 'PAID' THEN
    RAISE EXCEPTION 'Invalid transition from % to COMPLETED (Must be PAID)', v_current_status;
  END IF;

  -- 3. Execute actions based on target status
  IF p_target_status = 'ACCEPTED' THEN
    UPDATE public.orders
    SET
      status = 'ACCEPTED',
      accepted_by_staff_id = COALESCE(p_staff_id, accepted_by_staff_id),
      accepted_at = now(),
      updated_at = now()
    WHERE id = p_order_id;

  ELSIF p_target_status = 'PAID' THEN
    IF p_payment_data IS NOT NULL THEN
      INSERT INTO public.payments (
        order_id,
        payment_method,
        amount,
        cash_tendered,
        change_returned,
        cash_amount,
        upi_amount,
        transaction_reference,
        status,
        staff_id,
        created_at
      )
      VALUES (
        p_order_id,
        (p_payment_data->>'method')::TEXT,
        (p_payment_data->>'amount')::NUMERIC,
        (p_payment_data->>'cashTendered')::NUMERIC,
        (p_payment_data->>'changeReturned')::NUMERIC,
        COALESCE((p_payment_data->>'cashAmount')::NUMERIC, 0),
        COALESCE((p_payment_data->>'upiAmount')::NUMERIC, 0),
        (p_payment_data->>'transactionReference')::TEXT,
        'SUCCESS',
        p_staff_id,
        now()
      );
    END IF;

    UPDATE public.orders
    SET
      status = 'PAID',
      paid_at = now(),
      updated_at = now()
    WHERE id = p_order_id;

  ELSIF p_target_status = 'COMPLETED' THEN
    -- DEDUCT INVENTORY ATOMICALLY ON COMPLETION ONLY
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id
    LOOP
      SELECT stock INTO v_curr_stock
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;

      v_new_stock := GREATEST(0, v_curr_stock - v_item.quantity);

      UPDATE public.products
      SET
        stock = v_new_stock,
        updated_at = now()
      WHERE id = v_item.product_id;

      INSERT INTO public.inventory_logs (
        product_id,
        change_quantity,
        stock_before,
        stock_after,
        reason,
        order_id,
        created_by,
        created_at
      )
      VALUES (
        v_item.product_id,
        -v_item.quantity,
        v_curr_stock,
        v_new_stock,
        'ORDER_COMPLETED',
        p_order_id,
        p_staff_id,
        now()
      );
    END LOOP;

    UPDATE public.orders
    SET
      status = 'COMPLETED',
      completed_by_staff_id = COALESCE(p_staff_id, completed_by_staff_id),
      completed_at = now(),
      updated_at = now()
    WHERE id = p_order_id;

  ELSIF p_target_status = 'VOID' THEN
    UPDATE public.orders
    SET
      status = 'VOID',
      void_reason = p_notes,
      updated_at = now()
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'previous_status', v_current_status,
    'new_status', p_target_status,
    'success', true
  );
END;
$$;

-- Function 3: Reset exhibition data (Admin only)
CREATE OR REPLACE FUNCTION public.reset_exhibition_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Safe deletion with WHERE clauses and proper foreign key order
  DELETE FROM public.payments WHERE id IS NOT NULL;
  DELETE FROM public.inventory_logs WHERE reason = 'ORDER_COMPLETED' OR id IS NOT NULL;
  DELETE FROM public.order_items WHERE id IS NOT NULL;
  DELETE FROM public.orders WHERE id IS NOT NULL;
  UPDATE public.token_counter SET last_token_number = 0, updated_at = now() WHERE counter_date IS NOT NULL;

  -- Reset product stock back to official exhibition inventory levels
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

-- ====================================================================
-- REALTIME SUBSCRIPTIONS
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow modify products" ON public.products FOR ALL USING (true);

CREATE POLICY "Allow read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update orders" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Allow read order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow insert payments" ON public.payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow token counter" ON public.token_counter FOR ALL USING (true);
CREATE POLICY "Allow inventory logs" ON public.inventory_logs FOR ALL USING (true);
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow update profiles" ON public.profiles FOR ALL USING (true);

-- ====================================================================
-- SEED DATA - 12 EXACT EXHIBITION TOY PRODUCTS
-- ====================================================================
INSERT INTO public.products (id, name, category, price, stock, image, active, barcode)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Spiderman Mask', 'Costumes & Masks', 48, 60, 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=400&auto=format&fit=crop&q=80', true, '8901001'),
  ('c0000001-0000-0000-0000-000000000002', 'Mini Basketball', 'Sports & Outdoors', 75, 50, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80', true, '8901002'),
  ('c0000001-0000-0000-0000-000000000003', 'Kataana', 'Weapons & Roleplay', 55, 45, 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&auto=format&fit=crop&q=80', true, '8901003'),
  ('c0000001-0000-0000-0000-000000000004', 'Fidget Spinner', 'Fidget & Sensory', 29, 80, 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&auto=format&fit=crop&q=80', true, '8901004'),
  ('c0000001-0000-0000-0000-000000000005', 'Squishy Ball', 'Squishy & Stress Toys', 58, 65, 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&auto=format&fit=crop&q=80', true, '8901005'),
  ('c0000001-0000-0000-0000-000000000006', 'Squishy Ball Multiclr', 'Squishy & Stress Toys', 58, 65, 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=400&auto=format&fit=crop&q=80', true, '8901006'),
  ('c0000001-0000-0000-0000-000000000007', 'Jewelary Kids', 'Fashion & Jewelry', 390, 30, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&auto=format&fit=crop&q=80', true, '8901007'),
  ('c0000001-0000-0000-0000-000000000008', 'Spinning ball', 'Fidget & Sensory', 85, 40, 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=400&auto=format&fit=crop&q=80', true, '8901008'),
  ('c0000001-0000-0000-0000-000000000009', 'Bubble Gun', 'Outdoor & Bubbles', 195, 35, 'https://images.unsplash.com/photo-1560963689-02e82017fb3c?w=400&auto=format&fit=crop&q=80', true, '8901009'),
  ('c0000001-0000-0000-0000-000000000010', 'Frog Squishy', 'Squishy & Stress Toys', 58, 50, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&auto=format&fit=crop&q=80', true, '8901010'),
  ('c0000001-0000-0000-0000-000000000011', 'Slime', 'Slime & Dough', 55, 70, 'https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=400&auto=format&fit=crop&q=80', true, '8901011'),
  ('c0000001-0000-0000-0000-000000000012', 'Magnetic power kit', 'STEM & Educational', 78, 35, 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&auto=format&fit=crop&q=80', true, '8901012')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  image = EXCLUDED.image,
  category = EXCLUDED.category;
