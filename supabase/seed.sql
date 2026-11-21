-- ====================================================================
-- SEED DATA - TOY STALL PRODUCTS (Exact Exhibition Inventory)
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
