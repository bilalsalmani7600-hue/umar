import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('🧪 Testing 1-Tap Mobile Approve & Atomic Stock Deduction...\n');

  // 1. Check current stock of Spiderman
  const { data: prodBefore } = await supabase.from('products').select('*').eq('name', 'Spiderman').single();
  console.log(`1. Target: "${prodBefore.name}" | Stock BEFORE: ${prodBefore.stock} pcs`);

  // 2. Generate a Token Order for 2 pcs
  const qtyToBuy = 2;
  const { data: ordRes, error: ordErr } = await supabase.rpc('create_token_order', {
    p_items: [
      {
        product_id: prodBefore.id,
        product_name: prodBefore.name,
        unit_price: prodBefore.price,
        quantity: qtyToBuy,
        subtotal: prodBefore.price * qtyToBuy,
        image: prodBefore.image,
      }
    ],
    p_counter_id: 'Mobile 1',
  });
  if (ordErr) throw ordErr;
  console.log(`2. Generated Token Order: ${ordRes.token_number} (ID: ${ordRes.order_id})`);

  // 3. Perform 1-Tap Approve (transitioning directly to COMPLETED via auto-chaining)
  console.log('3. Cashier taps "Approve" (executing auto-chain to COMPLETED)...');
  
  // Step A: ACCEPTED
  await supabase.rpc('transition_order_status', {
    p_order_id: ordRes.order_id,
    p_target_status: 'ACCEPTED',
  });
  // Step B: PAID
  await supabase.rpc('transition_order_status', {
    p_order_id: ordRes.order_id,
    p_target_status: 'PAID',
    p_payment_data: {
      method: 'CASH',
      amount: prodBefore.price * qtyToBuy,
      cashAmount: prodBefore.price * qtyToBuy,
    },
  });
  // Step C: COMPLETED (triggers atomic inventory deduction in PostgreSQL)
  const { error: compErr } = await supabase.rpc('transition_order_status', {
    p_order_id: ordRes.order_id,
    p_target_status: 'COMPLETED',
  });
  if (compErr) throw compErr;

  // 4. Verify Stock AFTER
  const { data: prodAfter } = await supabase.from('products').select('*').eq('id', prodBefore.id).single();
  console.log(`4. Stock AFTER: ${prodAfter.stock} pcs`);

  const expectedStock = prodBefore.stock - qtyToBuy;
  if (prodAfter.stock === expectedStock) {
    console.log(`\n✅ TEST PASSED: Stock was reduced from ${prodBefore.stock} to ${prodAfter.stock} (-${qtyToBuy} pcs)!`);
  } else {
    console.error(`\n❌ TEST FAILED: Expected ${expectedStock}, but got ${prodAfter.stock}`);
    process.exit(1);
  }

  // 5. Clean up test order & restore stock
  await supabase.from('payments').delete().eq('order_id', ordRes.order_id);
  await supabase.from('inventory_logs').delete().eq('order_id', ordRes.order_id);
  await supabase.from('order_items').delete().eq('order_id', ordRes.order_id);
  await supabase.from('orders').delete().eq('id', ordRes.order_id);
  await supabase.from('products').update({ stock: prodBefore.stock }).eq('id', prodBefore.id);
  console.log(`5. Cleaned test order and restored ${prodBefore.name} stock to ${prodBefore.stock}.\n`);

  process.exit(0);
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
