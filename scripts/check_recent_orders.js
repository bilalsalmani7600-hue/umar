import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrders() {
  const { data } = await supabase.from('orders').select('token_number, token_sequence, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('Recent 10 orders:', data);
  process.exit(0);
}

checkOrders();

