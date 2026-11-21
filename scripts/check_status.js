import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  try {
    const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    console.log('Orders in DB:', count, 'Error:', error);
    const { data: counter } = await supabase.from('token_counter').select('*');
    console.log('Token counter:', counter);
  } catch(e) {
    console.error('Catch error:', e);
  } finally {
    process.exit(0);
  }
}

check();
