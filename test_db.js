import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey; // We'll try to find it

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log("Checking user_plans with service_role...");
  const { data, error } = await supabaseAdmin.from('user_plans').select('*');
  console.log("Plans:", data);
  console.log("Error:", error);
}

test();
