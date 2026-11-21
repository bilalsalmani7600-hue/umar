import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test2Devices() {
  console.log('Testing 2 parallel mobile devices creating 20 orders...');
  const start = Date.now();
  const { data: prods } = await supabase.from('products').select('*').limit(3);

  let count = 0;
  for (let b = 0; b < 20; b += 2) {
    const p1 = supabase.rpc('create_token_order', {
      p_items: [{ product_id: prods[0].id, product_name: prods[0].name, unit_price: prods[0].price, quantity: 1, image: prods[0].image }],
      p_counter_id: 'Mobile 1',
      p_notes: `Order #${b + 1}`
    });
    const p2 = supabase.rpc('create_token_order', {
      p_items: [{ product_id: prods[1].id, product_name: prods[1].name, unit_price: prods[1].price, quantity: 1, image: prods[1].image }],
      p_counter_id: 'Mobile 2',
      p_notes: `Order #${b + 2}`
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    if (r1.data) count++;
    if (r2.data) count++;
    await new Promise(r => setTimeout(r, 10));
  }

  console.log(`Successfully generated ${count}/20 orders in ${Date.now() - start}ms!`);
  process.exit(0);
}

test2Devices().catch(e => {
  console.error(e);
  process.exit(1);
});

