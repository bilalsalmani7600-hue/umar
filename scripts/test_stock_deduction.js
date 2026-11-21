import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function testStock() {
  console.log('🧪 Testing Live Order Creation & Stock Deduction in Supabase...\n');

  // 1. Check initial stock of Slime
  const { data: before } = await supabase.from('products').select('id, name, stock').eq('name', 'Slime').single();
  console.log(`1. Slime Stock BEFORE: ${before.stock} (ID: ${before.id})`);

  // 2. Create order for 1 Slime
  const { data: orderRes, error: createErr } = await supabase.rpc('create_token_order', {
    p_items: [
      {
        product_id: before.id,
        product_name: before.name,
        unit_price: 55,
        quantity: 1,
        subtotal: 55,
      }
    ],
    p_counter_id: 'Test Counter',
  });
  if (createErr) throw createErr;
  console.log(`2. Created Order: ${orderRes.token_number} (ID: ${orderRes.order_id})`);

  // 3. Transition NEW -> ACCEPTED
  const { error: accErr } = await supabase.rpc('transition_order_status', {
    p_order_id: orderRes.order_id,
    p_target_status: 'ACCEPTED',
  });
  if (accErr) throw accErr;
  console.log('3. Transitioned -> ACCEPTED');

  // 4. Transition ACCEPTED -> PAID
  const { error: paidErr } = await supabase.rpc('transition_order_status', {
    p_order_id: orderRes.order_id,
    p_target_status: 'PAID',
    p_payment_data: { method: 'CASH', amount: 55 },
  });
  if (paidErr) throw paidErr;
  console.log('4. Transitioned -> PAID');

  // 5. Transition PAID -> COMPLETED
  const { error: compErr } = await supabase.rpc('transition_order_status', {
    p_order_id: orderRes.order_id,
    p_target_status: 'COMPLETED',
  });
  if (compErr) throw compErr;
  console.log('5. Transitioned -> COMPLETED');

  // 6. Check stock of Slime AFTER
  const { data: after } = await supabase.from('products').select('id, name, stock').eq('name', 'Slime').single();
  console.log(`6. Slime Stock AFTER: ${after.stock}`);

  if (after.stock === before.stock - 1) {
    console.log('\n✅ SUCCESS: Stock was deducted atomically in PostgreSQL!');
  } else {
    console.log(`\n❌ ERROR: Stock did not deduct as expected: before=${before.stock}, after=${after.stock}`);
  }

  // Clean up the test order
  await supabase.from('payments').delete().eq('order_id', orderRes.order_id);
  await supabase.from('inventory_logs').delete().eq('order_id', orderRes.order_id);
  await supabase.from('order_items').delete().eq('order_id', orderRes.order_id);
  await supabase.from('orders').delete().eq('id', orderRes.order_id);
  // Restore Slime stock
  await supabase.from('products').update({ stock: before.stock }).eq('name', 'Slime');
  console.log('7. Cleaned up test order and restored Slime stock.');

  process.exit(0);
}

testStock().catch((err) => {
  console.error(err);
  process.exit(1);
});
