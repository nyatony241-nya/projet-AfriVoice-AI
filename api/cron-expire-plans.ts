import { createClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════
// Cron Job Quotidien — Vérification des abonnements expirés
// S'exécute chaque jour à 01h00 UTC
// Si expires_at < maintenant ET plan_id != 'free' → repasse en free
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
    console.error('[CronExpire] Variables Supabase manquantes');
    return res.status(500).json({ error: 'Configuration serveur incorrecte' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date().toISOString();

    // 1. Trouver tous les plans payants expirés (expires_at dépassé ET pas encore remis en free)
    const { data: expiredPlans, error: fetchError } = await supabase
      .from('user_plans')
      .select('email, plan_id, expires_at')
      .not('plan_id', 'eq', 'free')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (fetchError) {
      console.error('[CronExpire] Erreur lecture plans expirés:', fetchError);
      return res.status(500).json({ error: 'Erreur lecture base de données' });
    }

    if (!expiredPlans || expiredPlans.length === 0) {
      console.log('[CronExpire] Aucun plan expiré aujourd\'hui.');
      return res.status(200).json({
        success: true,
        expired: 0,
        message: 'Aucun plan expiré',
        checkedAt: now,
      });
    }

    // 2. Repasser ces utilisateurs sur le plan gratuit
    const expiredEmails = expiredPlans.map((p: any) => p.email);

    const { error: updateError } = await supabase
      .from('user_plans')
      .update({
        plan_id: 'free',
        is_active: false,
        updated_at: now,
      })
      .in('email', expiredEmails);

    if (updateError) {
      console.error('[CronExpire] Erreur mise à jour plans expirés:', updateError);
      return res.status(500).json({ error: 'Erreur mise à jour base de données' });
    }

    // 3. Remettre le quota mensuel à la limite gratuite (300 secondes = 5 min)
    const { error: quotaError } = await supabase
      .from('user_quotas')
      .update({
        monthly_limit: 300,
        updated_at: now,
      })
      .in('email', expiredEmails);

    if (quotaError) {
      console.error('[CronExpire] Erreur mise à jour quota gratuit:', quotaError);
      // Non bloquant — continuer quand même
    }

    console.log(`✅ [CronExpire] ${expiredPlans.length} plan(s) expiré(s) repassé(s) en FREE :`, expiredEmails);

    return res.status(200).json({
      success: true,
      expired: expiredPlans.length,
      emails: expiredEmails,
      message: `${expiredPlans.length} abonnement(s) expiré(s) → plan gratuit`,
      checkedAt: now,
    });

  } catch (err: any) {
    console.error('[CronExpire] Erreur inattendue:', err?.message);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
