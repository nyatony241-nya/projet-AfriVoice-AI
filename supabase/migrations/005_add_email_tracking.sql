-- ══════════════════════════════════════════════════════════════════════════════
-- AfriVoice AI
-- Migration 005: Ajouter le suivi des e-mails automatisés
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ajout des colonnes de suivi dans user_quotas
ALTER TABLE public.user_quotas
  ADD COLUMN IF NOT EXISTS reminder_email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conversion_email_sent BOOLEAN DEFAULT FALSE;

-- On ne crée pas de contraintes complexes, ce sont juste des marqueurs.
