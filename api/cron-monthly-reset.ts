// ══════════════════════════════════════════════════════════════
// Cron Job Mensuel — DÉSACTIVÉ
// ────────────────────────────────────────────────────────────
// AfriVoice AI utilise désormais un modèle de CRÉDITS PRÉPAYÉS.
// Les crédits achetés ne s'expirent JAMAIS mensuellement.
// Ce cron ne doit plus tourner — il est conservé en archive.
// ══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════
// [ARCHIVÉ] Ancien Cron Job Mensuel
// Les crédits sont permanents — aucun reset n'est effectué
// ══════════════════════════════════════════════════════════════

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // ════════════════════════════════════════════════════════
  // MODÈLE CRÉDITS PRÉPAYÉS — CE CRON EST DÉSACTIVÉ
  // Les crédits achetés ne s'expirent JAMAIS.
  // Chaque pack (Starter, Creator, Pro) ajoute des crédits
  // permanents au wallet de l'utilisateur.
  // ════════════════════════════════════════════════════════
  console.log('[CronReset] ⚠️ Cron désactivé — modèle crédits permanents actif.');
  return res.status(200).json({
    success: true,
    disabled: true,
    message: 'Ce cron est désactivé. AfriVoice AI utilise un modèle de crédits permanents (pas de reset mensuel).',
  });
}
