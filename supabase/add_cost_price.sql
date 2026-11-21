-- ====================================================================
-- MIGRATION: ADD REAL COST PRICE (WHOLESALE AMOUNT) TO PRODUCTS
-- Project: luamazblgroduhlbvjip
-- Supabase SQL Editor: https://supabase.com/dashboard/project/luamazblgroduhlbvjip/sql/new
-- ====================================================================

-- 1. Add cost_price column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;

-- 2. Populate cost prices for the 25 official products
UPDATE public.products SET cost_price = 110 WHERE barcode = '8902001'; -- Dumpling (Selling: 180, Cost: 110)
UPDATE public.products SET cost_price = 18  WHERE barcode = '8902002'; -- Rainbow spring (Selling: 30, Cost: 18)
UPDATE public.products SET cost_price = 32  WHERE barcode = '8902003'; -- Slime (Selling: 55, Cost: 32)
UPDATE public.products SET cost_price = 22  WHERE barcode = '8902004'; -- Spiderman (Selling: 37, Cost: 22)
UPDATE public.products SET cost_price = 50  WHERE barcode = '8902005'; -- Horror mask (Selling: 85, Cost: 50)
UPDATE public.products SET cost_price = 24  WHERE barcode = '8902006'; -- Snake (Selling: 39, Cost: 24)
UPDATE public.products SET cost_price = 40  WHERE barcode = '8902007'; -- Unicorn (Selling: 68, Cost: 40)
UPDATE public.products SET cost_price = 240 WHERE barcode = '8902008'; -- Flying boy (Selling: 390, Cost: 240)
UPDATE public.products SET cost_price = 28  WHERE barcode = '8902009'; -- Halloween (Selling: 48, Cost: 28)
UPDATE public.products SET cost_price = 16  WHERE barcode = '8902010'; -- Spinner (₹28) (Selling: 28, Cost: 16)
UPDATE public.products SET cost_price = 90  WHERE barcode = '8902011'; -- Cube (Selling: 145, Cost: 90)
UPDATE public.products SET cost_price = 22  WHERE barcode = '8902012'; -- UNO card (Selling: 39, Cost: 22)
UPDATE public.products SET cost_price = 45  WHERE barcode = '8902013'; -- Gatling gun (Selling: 75, Cost: 45)
UPDATE public.products SET cost_price = 35  WHERE barcode = '8902014'; -- Keychain (₹58) (Selling: 58, Cost: 35)
UPDATE public.products SET cost_price = 35  WHERE barcode = '8902015'; -- Spinner (₹58) (Selling: 58, Cost: 35)
UPDATE public.products SET cost_price = 42  WHERE barcode = '8902016'; -- Keychain (₹68) (Selling: 68, Cost: 42)
UPDATE public.products SET cost_price = 45  WHERE barcode = '8902017'; -- Pressure slime (Selling: 75, Cost: 45)
UPDATE public.products SET cost_price = 46  WHERE barcode = '8902018'; -- Gun Orbeez (Selling: 78, Cost: 46)
UPDATE public.products SET cost_price = 105 WHERE barcode = '8902019'; -- 2060 Grip (Selling: 175, Cost: 105)
UPDATE public.products SET cost_price = 18  WHERE barcode = '8902020'; -- Laser lite (Selling: 30, Cost: 18)
UPDATE public.products SET cost_price = 28  WHERE barcode = '8902021'; -- Camera (Selling: 48, Cost: 28)
UPDATE public.products SET cost_price = 28  WHERE barcode = '8902022'; -- Keychain (₹48) (Selling: 48, Cost: 28)
UPDATE public.products SET cost_price = 72  WHERE barcode = '8902023'; -- Metal car (Selling: 120, Cost: 72)
UPDATE public.products SET cost_price = 240 WHERE barcode = '8902024'; -- Music Gun (Selling: 390, Cost: 240)
UPDATE public.products SET cost_price = 40  WHERE barcode = '8902025'; -- Candy Flower (Selling: 68, Cost: 40)
