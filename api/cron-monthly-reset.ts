import { createClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════
// Cron Job Mensuel — Vercel Serverless Function
// S'exécute automatiquement le 1er de chaque mois à 00:00 UTC
// Remet seconds_used à 0 pour tous les utilisateurs
// CONSERVE bonus_seconds (recharges valides 12 mois)
// CONSERVE plan_id (abonnement actif)
// ══════════════════════════════════════════════════════════════

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // Sécurité : vérifier le header secret Vercel Cron
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CronReset] Variables Supabase manquantes');
    return res.status(500).json({ error: 'Configuration serveur incorrecte' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Récupérer tous les quotas dont la reset_date est inférieure au mois en cours
    // = les utilisateurs qui n'ont pas encore été réinitialisés ce mois
    const { data: quotasToReset, error: fetchError } = await supabase
      .from('user_quotas')
      .select('email, seconds_used, reset_date')
      .lt('reset_date', currentMonth);

    if (fetchError) {
      console.error('[CronReset] Erreur lecture quotas:', fetchError);
      return res.status(500).json({ error: 'Erreur lecture base de données' });
    }

    if (!quotasToReset || quotasToReset.length === 0) {
      console.log('[CronReset] Aucun quota à réinitialiser ce mois.');
      return res.status(200).json({
        success: true,
        reset: 0,
        message: 'Aucun quota à réinitialiser',
        month: currentMonth,
      });
    }

    // Réinitialiser seconds_used à 0 et mettre à jour reset_date
    // ⚠️ IMPORTANT : bonus_seconds est CONSERVÉ (les recharges ne s'expirent pas mensuellement)
    const { error: updateError } = await supabase
      .from('user_quotas')
      .update({
        seconds_used: 0,
        reset_date: currentMonth,
        updated_at: now.toISOString(),
      })
      .lt('reset_date', currentMonth);

    if (updateError) {
      console.error('[CronReset] Erreur mise à jour quotas:', updateError);
      return res.status(500).json({ error: 'Erreur mise à jour base de données' });
    }

    console.log(`✅ [CronReset] Reset mensuel effectué : ${quotasToReset.length} utilisateurs remis à zéro (mois: ${currentMonth})`);

    return res.status(200).json({
      success: true,
      reset: quotasToReset.length,
      message: `${quotasToReset.length} utilisateur(s) remis à zéro`,
      month: currentMonth,
    });

  } catch (err: any) {
    console.error('[CronReset] Erreur inattendue:', err?.message);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
