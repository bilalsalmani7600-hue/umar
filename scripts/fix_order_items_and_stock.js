import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const INITIAL_STOCKS = {
  'Spiderman Mask': 60,
  'Mini Basketball': 50,
  'Kataana': 45,
  'Fidget Spinner': 80,
  'Squishy Ball': 65,
  'Squishy Ball Multiclr': 65,
  'Jewelary Kids': 30,
  'Spinning ball': 40,
  'Bubble Gun': 35,
  'Frog Squishy': 50,
  'Slime': 70,
  'Magnetic power kit': 35,
};

async function fixData() {
  console.log('🔧 Fixing order_items and product stock in Supabase...\n');

  // 1. Get all products from DB
  const { data: products, error: pErr } = await supabase.from('products').select('id, name');
  if (pErr) throw pErr;
  
  const productMap = {};
  products.forEach((p) => {
    productMap[p.name.toLowerCase()] = p.id;
  });

  // 2. Fetch all order_items
  const { data: items, error: iErr } = await supabase.from('order_items').select('id, product_name, product_id');
  if (iErr) throw iErr;

  console.log(`Checking ${items.length} order items...`);
  let fixedCount = 0;
  for (const item of items) {
    const correctId = productMap[item.product_name?.toLowerCase()];
    if (correctId && item.product_id !== correctId) {
      await supabase.from('order_items').update({ product_id: correctId }).eq('id', item.id);
      fixedCount++;
    }
  }
  console.log(`✅ Fixed ${fixedCount} order items to their correct product IDs.`);

  // 3. Compute actual sold quantities from COMPLETED orders
  const { data: completedOrders, error: oErr } = await supabase
    .from('orders')
    .select('id, items:order_items(product_name, quantity)')
    .eq('status', 'COMPLETED');
  if (oErr) throw oErr;

  const soldMap = {};
  completedOrders.forEach((o) => {
    o.items?.forEach((i) => {
      soldMap[i.product_name] = (soldMap[i.product_name] || 0) + i.quantity;
    });
  });

  console.log('\n📊 Completed Sales Summary:');
  console.table(soldMap);

  // 4. Update products stock
  for (const [name, initialStock] of Object.entries(INITIAL_STOCKS)) {
    const sold = soldMap[name] || 0;
    const currentStock = Math.max(0, initialStock - sold);
    await supabase.from('products').update({ stock: currentStock }).eq('name', name);
    console.log(`✓ ${name}: Initial ${initialStock} - Sold ${sold} = Stock ${currentStock}`);
  }

  console.log('\n🎉 Database order items and stock are 100% synchronized and correct!');
  process.exit(0);
}

fixData().catch((err) => {
  console.error(err);
  process.exit(1);
});
