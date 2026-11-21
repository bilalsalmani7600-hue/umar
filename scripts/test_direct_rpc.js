import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

const SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

async function testDirectFetchRPC() {
  const start = Date.now();
  console.log('Testing direct fetch to create_token_order...');

  const items = [{
    product_id: 'c0000001-0000-0000-0000-000000000001',
    product_name: 'Spiderman Mask',
    unit_price: 48,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?w=400'
  }];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_token_order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_items: items,
      p_counter_id: 'Mobile 1',
      p_notes: 'Direct fetch test'
    })
  });

  const data = await res.json();
  console.log(`Direct fetch RPC completed in ${Date.now() - start}ms:`, data);
  process.exit(0);
}

testDirectFetchRPC().catch(err => {
  console.error('Direct fetch error:', err);
  process.exit(1);
});

