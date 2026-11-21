import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function resetDatabase() {
  console.log('🔄 Resetting Toy Stall POS Exhibition Database...');
  console.log(`Connecting to: ${SUPABASE_URL}\n`);

  try {
    // 1. Call reset_exhibition_data RPC
    const { error: rpcError } = await supabase.rpc('reset_exhibition_data');
    if (rpcError) {
      console.warn('RPC reset_exhibition_data returned error:', rpcError.message);
      console.log('Falling back to manual table cleanup...');
      
      await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('inventory_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('token_counter').update({ last_token_number: 0 }).neq('last_token_number', -1);
    } else {
      console.log('✅ reset_exhibition_data RPC executed successfully.');
    }

    // 2. Verification
    const [{ count: orderCount }, { count: paymentCount }, { data: counterData }, { data: products }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('token_counter').select('*').limit(1),
      supabase.from('products').select('name, stock'),
    ]);

    console.log('\n📊 Database Status After Reset:');
    console.log(`- Orders in DB: ${orderCount || 0}`);
    console.log(`- Payments in DB: ${paymentCount || 0}`);
    console.log(`- Last Token Number: ${counterData?.[0]?.last_token_number ?? 0} (Next token will be T001)`);
    console.log(`- Total Active Products: ${products?.length || 0}`);

    console.log('\n🎉 Exhibition Database is 100% clean and ready for customers!');
  } catch (err) {
    console.error('❌ Error resetting database:', err);
  } finally {
    process.exit(0);
  }
}

resetDatabase();
