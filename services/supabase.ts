import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "🔴 ERREUR CRITIQUE : Les clés Supabase (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY) sont absentes.",
    "\n→ Sur Vercel : Settings > Environment Variables > Ajoutez-les puis Redéployez.",
    "\n→ En local : Créez un fichier .env avec ces variables."
  );
}

// Utiliser un placeholder pour éviter que createClient ne crashe l'application entière
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
