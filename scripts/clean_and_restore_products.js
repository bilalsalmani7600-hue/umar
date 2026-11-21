import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const CATALOG = [
  { barcode: '8901001', name: 'Spiderman Mask', stock: 60, price: 48 },
  { barcode: '8901002', name: 'Mini Basketball', stock: 50, price: 75 },
  { barcode: '8901003', name: 'Kataana', stock: 45, price: 55 },
  { barcode: '8901004', name: 'Fidget Spinner', stock: 80, price: 29 },
  { barcode: '8901005', name: 'Squishy Ball', stock: 65, price: 58 },
  { barcode: '8901006', name: 'Squishy Ball Multiclr', stock: 65, price: 58 },
  { barcode: '8901007', name: 'Jewelary Kids', stock: 30, price: 390 },
  { barcode: '8901008', name: 'Spinning ball', stock: 40, price: 85 },
  { barcode: '8901009', name: 'Bubble Gun', stock: 35, price: 195 },
  { barcode: '8901010', name: 'Frog Squishy', stock: 50, price: 58 },
  { barcode: '8901011', name: 'Slime', stock: 70, price: 55 },
  { barcode: '8901012', name: 'Magnetic power kit', stock: 35, price: 78 },
];

async function cleanAndRestore() {
  console.log('🔄 Cleaning & Restoring Exhibition Products in Supabase...');

  // 1. Deactivate test products like "bilal"
  const { error: deactErr } = await supabase
    .from('products')
    .update({ active: false })
    .ilike('name', '%bilal%');
  if (deactErr) console.warn('Could not deactivate bilal:', deactErr.message);
  else console.log('✅ Inactive test product "bilal" deactivated.');

  // 2. Restore stocks and prices for the 12 exhibition products
  for (const item of CATALOG) {
    const { error } = await supabase
      .from('products')
      .update({ stock: item.stock, price: item.price, active: true })
      .eq('barcode', item.barcode);

    if (error) {
      // Try by name if barcode didn't match
      await supabase
        .from('products')
        .update({ stock: item.stock, price: item.price, active: true })
        .eq('name', item.name);
    }
    console.log(`✓ ${item.name}: Stock set to ${item.stock}, Price ₹${item.price}`);
  }

  // 3. Query current active products
  const { data: activeProducts } = await supabase
    .from('products')
    .select('name, price, stock, active, barcode')
    .eq('active', true)
    .order('name');

  console.log('\n📊 Currently Active Products in Supabase:');
  console.table(activeProducts);

  process.exit(0);
}

cleanAndRestore().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
