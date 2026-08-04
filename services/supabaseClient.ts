import { createClient } from '@supabase/supabase-js';

// ── Supabase Configuration ──────────────────────────────────────
// Les clés doivent être définies via les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
// Note: La clé anon est publique par design (protégée par RLS côté Supabase).
// IMPORTANT: Ne JAMAIS hardcoder de clés ici — utiliser .env.local en développement.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⛔ ERREUR CRITIQUE: Variables d\'environnement Supabase manquantes.\n' +
    'Créez un fichier .env.local avec:\n' +
    '  VITE_SUPABASE_URL=https://votre-projet.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=votre_cle_anon'
  );
}

// Nettoyer l'URL (supprimer les suffixes /rest/v1/ etc. si présents)
const cleanUrl = supabaseUrl
  .replace(/\/(rest\/v1|auth\/v1|functions\/v1)\/?.*$/, '')
  .replace(/\/$/, '');

export const supabase = createClient(cleanUrl || supabaseUrl, supabaseAnonKey);
