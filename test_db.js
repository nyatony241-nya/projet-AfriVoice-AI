require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: quotas, error: fetchErr } = await supabase.from('user_quotas').select('*');
  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }
  console.log("Current quotas:");
  console.table(quotas);
}

main();
