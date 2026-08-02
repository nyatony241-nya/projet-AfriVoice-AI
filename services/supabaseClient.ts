import { createClient } from '@supabase/supabase-js';

// URL racine Supabase (sans /rest/v1/ - uniquement le domaine de base)
const SUPABASE_URL = 'https://khvjkisxygjbbjkmypqd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodmpraXN4eWdqYmJqa215cHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1OTc5NzcsImV4cCI6MjEwMTE3Mzk3N30.T8uqculOuVcOhBiTB_dO7EAj7mTAprwafECl2FeqQnA';

// Utilise les variables d'environnement si disponibles, sinon les valeurs ci-dessus
const rawUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseUrl = rawUrl
  .replace(/\/(rest\/v1|auth\/v1|functions\/v1)\/?.*$/, '')
  .replace(/\/$/, '') || SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

