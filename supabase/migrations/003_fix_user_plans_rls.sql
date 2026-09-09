-- ══════════════════════════════════════════════════════════════════════════════
-- AfriVoice AI — Migration 003
-- Fix user_plans : ajouter policies INSERT + UPDATE pour utilisateurs authentifiés
-- ET corriger manuellement les comptes ayant payé (monthly_limit > 0 mais plan 'none')
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. Policy INSERT sur user_plans (pour applyLocally côté client)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_plans'
      AND policyname = 'user_plans_insert_own'
  ) THEN
    CREATE POLICY "user_plans_insert_own" ON public.user_plans
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
      );
  END IF;
END$$;

-- ─────────────────────────────────────────────
-- 2. Policy UPDATE sur user_plans (pour applyLocally côté client)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_plans'
      AND policyname = 'user_plans_update_own'
  ) THEN
    CREATE POLICY "user_plans_update_own" ON public.user_plans
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
-- 3. Grants INSERT + UPDATE sur user_plans pour les utilisateurs authentifiés
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.user_plans TO authenticated;

-- ─────────────────────────────────────────────
-- 4. Corriger les comptes ayant payé mais avec plan_id 'none'/'free'
--    = ceux qui ont monthly_limit >= 600 dans user_quotas
--    mais user_plans.plan_id toujours à 'none' ou 'free'
-- ─────────────────────────────────────────────
UPDATE public.user_plans up
SET
  plan_id = CASE
    WHEN uq.monthly_limit >= 3600 THEN 'pro'
    WHEN uq.monthly_limit >= 1800 THEN 'creator'
    WHEN uq.monthly_limit >= 600  THEN 'starter'
    ELSE up.plan_id
  END,
  is_active = TRUE,
  updated_at = NOW()
FROM public.user_quotas uq
WHERE up.email = uq.email
  AND uq.monthly_limit >= 600
  AND up.plan_id IN ('none', 'free');

-- ─────────────────────────────────────────────
-- 5. Vérification — voir l'état actuel des comptes
-- ─────────────────────────────────────────────
SELECT
  up.email,
  up.plan_id,
  up.is_active,
  uq.monthly_limit,
  uq.seconds_used,
  up.chariow_order_id
FROM public.user_plans up
LEFT JOIN public.user_quotas uq ON up.email = uq.email
ORDER BY up.updated_at DESC
LIMIT 20;
