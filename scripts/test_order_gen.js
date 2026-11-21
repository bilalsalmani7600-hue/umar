import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test50Orders() {
  console.log('Testing 50 orders in batches of 4 (realistic 2 mobile devices)...');
  const start = Date.now();
  const { data: prods } = await supabase.from('products').select('*').limit(5);

  let successCount = 0;
  for (let b = 0; b < 50; b += 4) {
    const promises = [];
    for (let i = 0; i < 4 && (b + i) < 50; i++) {
      const idx = b + i;
      const items = [{
        product_id: prods[idx % prods.length].id,
        product_name: prods[idx % prods.length].name,
        unit_price: prods[idx % prods.length].price,
        quantity: 1,
        image: prods[idx % prods.length].image
      }];
      promises.push(
        supabase.rpc('create_token_order', {
          p_items: items,
          p_counter_id: idx % 2 === 0 ? 'Mobile 1' : 'Mobile 2',
          p_notes: `Order #${idx + 1}`
        }).then(res => {
          if (res.data) successCount++;
          else console.error('Error on #', idx + 1, res.error);
        })
      );
    }
    await Promise.all(promises);
    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`Successfully created ${successCount}/50 orders in ${Date.now() - start}ms!`);
  process.exit(0);
}

test50Orders();
