import { createClient } from '@supabase/supabase-js';
import { sendReminderEmail, sendConversionEmail } from '../../services/emailService.js';

export const config = {
  maxDuration: 300,
};

export default async function handler(req: any, res: any) {
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Variables Supabase manquantes');
    return res.status(500).json({ error: 'Configuration serveur incorrecte' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('⏰ Début de la tâche cron: Email Follow-ups');
  let sentReminders = 0;
  let sentConversions = 0;

  try {
    // 1. Cible 1 : Inscrits il y a > 24h, n'ont pas utilisé l'essai, email non envoyé
    const { data: reminderTargets, error: err1 } = await supabase
      .from('user_quotas')
      .select('email, trial_used, reminder_email_sent')
      .eq('trial_used', false)
      .eq('reminder_email_sent', false);

    if (err1) console.error('Erreur requete reminderTargets:', err1);
    
    if (reminderTargets && reminderTargets.length > 0) {
      for (const target of reminderTargets) {
        const { data: profile } = await supabase.from('profiles').select('created_at, full_name').eq('email', target.email).single();
        if (profile) {
          const hoursSinceSignup = (new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursSinceSignup >= 24) {
            const success = await sendReminderEmail(target.email, profile.full_name || 'Créateur');
            if (success) {
              await supabase.from('user_quotas').update({ reminder_email_sent: true }).eq('email', target.email);
              sentReminders++;
            }
          }
        }
      }
    }

    // 2. Cible 2 : Ont utilisé l'essai il y a > 24h, pas abonnés, email non envoyé
    const { data: conversionTargets, error: err2 } = await supabase
      .from('user_quotas')
      .select('email, trial_used, trial_used_at, monthly_limit, conversion_email_sent')
      .eq('trial_used', true)
      .eq('conversion_email_sent', false)
      .lt('monthly_limit', 600) // Not subscribed
      .not('trial_used_at', 'is', null);

    if (err2) console.error('Erreur requete conversionTargets:', err2);

    if (conversionTargets && conversionTargets.length > 0) {
      for (const target of conversionTargets) {
        const hoursSinceTrial = (new Date().getTime() - new Date(target.trial_used_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceTrial >= 24) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('email', target.email).single();
          const success = await sendConversionEmail(target.email, profile?.full_name || 'Créateur');
          if (success) {
            await supabase.from('user_quotas').update({ conversion_email_sent: true }).eq('email', target.email);
            sentConversions++;
          }
        }
      }
    }

    console.log(`✅ Cron terminé : ${sentReminders} rappels, ${sentConversions} conversions envoyés.`);
    return res.status(200).json({ success: true, sentReminders, sentConversions });

  } catch (err: any) {
    console.error('❌ Erreur générale cron:', err);
    return res.status(500).json({ error: err.message });
  }
}
