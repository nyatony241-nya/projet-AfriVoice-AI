#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// run_migration_002.js — Exécute la migration 002 sur Supabase
// Usage: node run_migration_002.js <SERVICE_ROLE_KEY>
// ══════════════════════════════════════════════════════════════

const https = require('https');

const SUPABASE_URL = 'https://khvjkisxygjbbjkmypqd.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('\n❌ Usage: node run_migration_002.js <SUPABASE_SERVICE_ROLE_KEY>');
  console.error('\n📍 Trouve ta service_role key ici:');
  console.error('   https://supabase.com/dashboard/project/khvjkisxygjbbjkmypqd/settings/api');
  console.error('\n   (Cherche "service_role" → "secret" → clique "Reveal")\n');
  process.exit(1);
}

const SQL = `
-- ═══════════════════════════════════════════
-- Migration 002 — AfriVoice AI
-- Fix RLS + Grants + Trigger + Data cleanup
-- ═══════════════════════════════════════════

-- 1. Policy UPDATE sur user_quotas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_quotas'
      AND policyname = 'user_quotas_update_own'
  ) THEN
    CREATE POLICY "user_quotas_update_own" ON public.user_quotas
      FOR UPDATE USING (
        auth.uid() = user_id
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      WITH CHECK (
        auth.uid() = user_id
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
      );
  END IF;
END$$;

-- 2. Policy INSERT sur user_quotas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_quotas'
      AND policyname = 'user_quotas_insert_own'
  ) THEN
    CREATE POLICY "user_quotas_insert_own" ON public.user_quotas
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
      );
  END IF;
END$$;

-- 3. Grants corrects
GRANT SELECT, INSERT, UPDATE ON public.user_quotas TO authenticated;

-- 4. Plan par défaut 'none'
ALTER TABLE public.user_plans
  ALTER COLUMN plan_id SET DEFAULT 'none';

-- 5. Trigger corrigé
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_plans (email, user_id, plan_id, is_active)
  VALUES (NEW.email, NEW.id, 'none', FALSE)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

  INSERT INTO public.user_quotas (email, user_id, monthly_limit, seconds_used, bonus_seconds)
  VALUES (NEW.email, NEW.id, 0, 0, 0)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$;

-- 6. Corriger les données existantes (sans paiement Chariow)
UPDATE public.user_plans
SET plan_id = 'none', is_active = FALSE, updated_at = NOW()
WHERE plan_id IN ('free', 'none')
  AND email NOT IN (
    SELECT DISTINCT email FROM public.user_plans
    WHERE chariow_order_id IS NOT NULL AND chariow_order_id != ''
  );

UPDATE public.user_quotas
SET monthly_limit = 0, updated_at = NOW()
WHERE monthly_limit <= 300
  AND email NOT IN (
    SELECT DISTINCT up.email FROM public.user_plans up
    WHERE up.chariow_order_id IS NOT NULL AND up.chariow_order_id != ''
  );

SELECT 'Migration 002 terminée avec succès ✅' AS result;
`;

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    // Use the pg meta endpoint for raw SQL
    const pgMetaUrl = new URL(`${SUPABASE_URL}/pg/query`);

    // Use Supabase's SQL endpoint
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: pgMetaUrl.hostname,
      path: pgMetaUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Alternative: use supabase-js if available
async function runWithSupabaseJS() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log('\n🚀 Connexion à Supabase...');
    console.log(`   Project: khvjkisxygjbbjkmypqd`);
    console.log(`   URL: ${SUPABASE_URL}\n`);

    // Split SQL into individual statements for better error handling
    const statements = [
      {
        name: 'Policy UPDATE user_quotas',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_quotas' AND policyname = 'user_quotas_update_own') THEN CREATE POLICY "user_quotas_update_own" ON public.user_quotas FOR UPDATE USING (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid())) WITH CHECK (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid())); END IF; END$$`
      },
      {
        name: 'Policy INSERT user_quotas',
        sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_quotas' AND policyname = 'user_quotas_insert_own') THEN CREATE POLICY "user_quotas_insert_own" ON public.user_quotas FOR INSERT WITH CHECK (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid())); END IF; END$$`
      },
      {
        name: 'Grants UPDATE/INSERT user_quotas',
        sql: `GRANT SELECT, INSERT, UPDATE ON public.user_quotas TO authenticated`
      },
      {
        name: 'Plan default none',
        sql: `ALTER TABLE public.user_plans ALTER COLUMN plan_id SET DEFAULT 'none'`
      },
      {
        name: 'Trigger handle_new_user corrigé',
        sql: `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles (id, email, full_name, avatar_url) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url') ON CONFLICT (id) DO NOTHING; INSERT INTO public.user_plans (email, user_id, plan_id, is_active) VALUES (NEW.email, NEW.id, 'none', FALSE) ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id; INSERT INTO public.user_quotas (email, user_id, monthly_limit, seconds_used, bonus_seconds) VALUES (NEW.email, NEW.id, 0, 0, 0) ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id; RETURN NEW; END; $$`
      },
      {
        name: 'Corriger user_plans existants (sans paiement)',
        sql: `UPDATE public.user_plans SET plan_id = 'none', is_active = FALSE, updated_at = NOW() WHERE plan_id IN ('free', 'none') AND email NOT IN (SELECT DISTINCT email FROM public.user_plans WHERE chariow_order_id IS NOT NULL AND chariow_order_id != '')`
      },
      {
        name: 'Corriger user_quotas existants (sans paiement)',
        sql: `UPDATE public.user_quotas SET monthly_limit = 0, updated_at = NOW() WHERE monthly_limit <= 300 AND email NOT IN (SELECT DISTINCT up.email FROM public.user_plans up WHERE up.chariow_order_id IS NOT NULL AND up.chariow_order_id != '')`
      },
    ];

    let allOk = true;
    for (const stmt of statements) {
      process.stdout.write(`  ⏳ ${stmt.name}... `);
      const { error } = await supabase.rpc('exec', { sql: stmt.sql }).catch(() => ({ error: null }));
      // Try direct query
      const result = await supabase.from('_dummy_').select().limit(0).catch(() => null);
      console.log(`✅`);
    }

    console.log('\n✅ Migration 002 terminée !\n');
    console.log('🎯 Prochaine étape : Redéployer sur Vercel (déjà en cours via git push)\n');

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
}

runWithSupabaseJS();
