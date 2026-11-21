import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

const start = Date.now();
console.log('Testing fetch with ipv4first...');
fetch('https://luamazblgroduhlbvjip.supabase.co/rest/v1/products?select=id,name&limit=1', {
  headers: {
    'apikey': 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff',
    'Authorization': 'Bearer sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff'
  }
})
.then(r => r.json())
.then(data => {
  console.log(`Fetch success in ${Date.now() - start}ms:`, data);
  process.exit(0);
})
.catch(err => {
  console.error(`Fetch error in ${Date.now() - start}ms:`, err);
  process.exit(1);
});
