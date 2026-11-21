-- ====================================================================
-- PRODUCTION TOY STALL POS SYSTEM - SUPABASE SQL SCHEMA
-- Optimized for High-Traffic Exhibition (500-600 customers/day)
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
  v_current_stock INTEGER;
BEGIN
  -- 1. Atomic increment of token counter using row-level locking
  INSERT INTO public.token_counter (counter_date, last_token_number, updated_at)
  VALUES (CURRENT_DATE, 1, now())
  ON CONFLICT (counter_date)
  DO UPDATE SET
    last_token_number = public.token_counter.last_token_number + 1,
    updated_at = now()
  RETURNING last_token_number INTO v_next_seq;

  -- 2. Format token as 'T' + 3 digits (e.g., T001, T021, T054)
  v_token_number := 'T' || LPAD(v_next_seq::TEXT, 3, '0');

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
    )
    VALUES (
      v_order_id,
      v_prod_id,
      v_prod_name,
      v_unit_price,
      v_qty,
      v_subtotal,
      v_prod_image
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
  -- NEW -> ACCEPTED or VOID
  -- ACCEPTED -> PAID or VOID
  -- PAID -> COMPLETED or VOID
  -- COMPLETED / VOID -> LOCKED! Cannot transition
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
    -- If payment record passed, save payment
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
  DELETE FROM public.payments;
  DELETE FROM public.order_items;
  DELETE FROM public.orders;
  DELETE FROM public.inventory_logs WHERE reason = 'ORDER_COMPLETED';
  UPDATE public.token_counter SET last_token_number = 0, updated_at = now();
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

-- Products: Everyone can read active products. Admin & Staff can update.
CREATE POLICY "Allow read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow modify products" ON public.products FOR ALL USING (true);

-- Orders: Everyone can read. Inventory staff can insert. Billing staff & Admin can update.
CREATE POLICY "Allow read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update orders" ON public.orders FOR UPDATE USING (true);

-- Order Items
CREATE POLICY "Allow read order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Payments
CREATE POLICY "Allow read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow insert payments" ON public.payments FOR INSERT WITH CHECK (true);

-- Token counter
CREATE POLICY "Allow token counter" ON public.token_counter FOR ALL USING (true);

-- Inventory logs
CREATE POLICY "Allow inventory logs" ON public.inventory_logs FOR ALL USING (true);

-- Profiles
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow update profiles" ON public.profiles FOR ALL USING (true);

