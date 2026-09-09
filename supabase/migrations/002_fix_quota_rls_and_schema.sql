-- ══════════════════════════════════════════════════════════════════════════════
-- AfriVoice AI — Migration 002
-- Fix RLS policies : permettre aux utilisateurs auth. de mettre à jour seconds_used
-- Fix schema : changer plan_id default de 'free' à 'none'
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. Ajouter policy UPDATE sur user_quotas
-- L'utilisateur authentifié peut mettre à jour UNIQUEMENT ses propres secondes
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 2. Ajouter policy INSERT sur user_quotas (pour upsert depuis le front)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 3. Grants UPDATE/INSERT sur user_quotas pour les utilisateurs authentifiés
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.user_quotas TO authenticated;

-- ─────────────────────────────────────────────
-- 4. Changer le default de plan_id dans user_plans de 'free' à 'none'
-- Les nouveaux inscrits ne doivent pas avoir de plan actif
-- ─────────────────────────────────────────────
ALTER TABLE public.user_plans
  ALTER COLUMN plan_id SET DEFAULT 'none';

-- ─────────────────────────────────────────────
-- 5. Mettre à jour le trigger de création de compte
-- ─────────────────────────────────────────────
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

  -- Plan par défaut : 'none' (aucun abonnement actif)
  INSERT INTO public.user_plans (email, user_id, plan_id, is_active)
  VALUES (NEW.email, NEW.id, 'none', FALSE)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

  -- Quota par défaut : 0 secondes
  INSERT INTO public.user_quotas (email, user_id, monthly_limit, seconds_used, bonus_seconds)
  VALUES (NEW.email, NEW.id, 0, 0, 0)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 6. Corriger les valeurs existantes (utilisateurs sans paiement Chariow)
-- ─────────────────────────────────────────────
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
