-- ══════════════════════════════════════════════════════════════════════════════
-- AfriVoice AI — Migration 004
-- Ajout du token d'essai gratuit ("Aha! Moment") pour les non-abonnés
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne trial_used à user_quotas
ALTER TABLE public.user_quotas
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMPTZ DEFAULT NULL;

-- 2. S'assurer que les utilisateurs existants ont trial_used = FALSE (défaut)
UPDATE public.user_quotas
SET trial_used = FALSE
WHERE trial_used IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ Migration 004 : trial_used ajouté avec succès
-- ══════════════════════════════════════════════════════════════════════════════
