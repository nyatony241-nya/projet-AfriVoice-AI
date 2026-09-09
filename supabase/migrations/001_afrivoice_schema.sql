-- ══════════════════════════════════════════════════════════════════════════════
-- AfriVoice AI — Schéma Supabase complet
-- Migration 001 — Création initiale
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────
-- 1. TABLE : profiles
-- Données publiques de l'utilisateur
-- Créée automatiquement à l'inscription via trigger
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  country       TEXT DEFAULT 'SN',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);


-- ─────────────────────────────────────────────
-- 2. TABLE : user_plans
-- Plan actif de l'utilisateur (activé via webhook Chariow)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_plans (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id           TEXT NOT NULL DEFAULT 'free',
  chariow_order_id  TEXT,
  activated_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_plans_email_idx   ON public.user_plans(email);
CREATE INDEX IF NOT EXISTS user_plans_user_id_idx ON public.user_plans(user_id);


-- ─────────────────────────────────────────────
-- 3. TABLE : user_quotas
-- Compteur de secondes audio générées + bonus recharges
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_quotas (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  monthly_limit    INTEGER DEFAULT 300,
  seconds_used     INTEGER DEFAULT 0,
  bonus_seconds    INTEGER DEFAULT 0,
  chariow_order_id TEXT,
  reset_date       DATE DEFAULT DATE_TRUNC('month', NOW())::DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_quotas_email_idx   ON public.user_quotas(email);
CREATE INDEX IF NOT EXISTS user_quotas_user_id_idx ON public.user_quotas(user_id);


-- ─────────────────────────────────────────────
-- 4. TABLE : generations
-- Historique des générations vocales
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generations (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email            TEXT,
  script_preview   TEXT,
  country          TEXT,
  gender           TEXT,
  voice_profile_id TEXT,
  duration_seconds INTEGER DEFAULT 0,
  generation_id    TEXT UNIQUE,
  provider         TEXT DEFAULT 'gemini',
  model_used       TEXT,
  status           TEXT DEFAULT 'success',
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generations_user_id_idx   ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS generations_email_idx     ON public.generations(email);
CREATE INDEX IF NOT EXISTS generations_created_at_idx ON public.generations(created_at DESC);


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_plans (lecture seule pour l'utilisateur — écriture via webhook service_role)
CREATE POLICY "user_plans_select_own" ON public.user_plans
  FOR SELECT USING (
    auth.uid() = user_id
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- user_quotas
CREATE POLICY "user_quotas_select_own" ON public.user_quotas
  FOR SELECT USING (
    auth.uid() = user_id
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- generations
CREATE POLICY "generations_select_own" ON public.generations
  FOR SELECT USING (
    auth.uid() = user_id
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "generations_insert_own" ON public.generations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. FONCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- Trigger : updated_at automatique
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_quotas_updated_at
  BEFORE UPDATE ON public.user_quotas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- Trigger : création automatique du profil + plan free à l'inscription
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
  VALUES (NEW.email, NEW.id, 'free', TRUE)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

  -- Plan free = 300 secondes (5 min) par mois
  INSERT INTO public.user_quotas (email, user_id, monthly_limit, seconds_used, bonus_seconds)
  VALUES (NEW.email, NEW.id, 300, 0, 0)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Fonction : mettre à jour le quota selon le plan (appelée après paiement Chariow)
CREATE OR REPLACE FUNCTION public.update_quota_for_plan(
  p_email   TEXT,
  p_plan_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  CASE p_plan_id
    WHEN 'free'    THEN v_limit := 300;    -- 5 min
    WHEN 'starter' THEN v_limit := 3600;   -- 1 heure
    WHEN 'creator' THEN v_limit := 10800;  -- 3 heures
    WHEN 'pro'     THEN v_limit := 21600;  -- 6 heures
    ELSE v_limit := 300;
  END CASE;

  INSERT INTO public.user_quotas (email, monthly_limit, seconds_used, bonus_seconds, reset_date)
  VALUES (p_email, v_limit, 0, 0, DATE_TRUNC('month', NOW())::DATE)
  ON CONFLICT (email) DO UPDATE SET
    monthly_limit = v_limit,
    seconds_used  = 0,
    reset_date    = DATE_TRUNC('month', NOW())::DATE,
    updated_at    = NOW();
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. VUE : mon compte (lecture sécurisée pour le frontend)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.my_account AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.country,
  up.plan_id,
  up.is_active          AS plan_active,
  up.activated_at       AS plan_activated_at,
  uq.monthly_limit,
  uq.seconds_used,
  uq.bonus_seconds,
  (uq.monthly_limit + uq.bonus_seconds - uq.seconds_used) AS seconds_remaining,
  uq.reset_date
FROM public.profiles p
LEFT JOIN public.user_plans  up ON p.email = up.email
LEFT JOIN public.user_quotas uq ON p.email = uq.email
WHERE p.id = auth.uid();

GRANT SELECT ON public.my_account TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 8. GRANTS
-- ══════════════════════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles    TO authenticated;
GRANT SELECT ON public.user_plans                  TO authenticated;
GRANT SELECT ON public.user_quotas                 TO authenticated;
GRANT SELECT, INSERT ON public.generations         TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_quota_for_plan TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ Schéma AfriVoice créé avec succès !
-- ══════════════════════════════════════════════════════════════════════════════
