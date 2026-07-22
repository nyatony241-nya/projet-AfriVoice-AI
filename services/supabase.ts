import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Attention : Les clés Supabase (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY) sont absentes de l'environnement.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
