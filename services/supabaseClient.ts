import { createClient } from '@supabase/supabase-js';

// Nettoie l'URL : retire /rest/v1/ ou tout chemin superflu pour garder uniquement le domaine racine
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/(rest\/v1|auth\/v1|functions\/v1)\/?.*$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
