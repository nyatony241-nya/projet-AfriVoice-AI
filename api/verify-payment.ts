import { createClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════
// API Vercel Serverless — Vérification de paiement Chariow
// Appelé par le frontend après retour de la page Chariow
// Vérifie le plan actif en base de données (table user_plans)
// ══════════════════════════════════════════════════════════════

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', process.env.FRONTEND_URL || ''].filter(Boolean);
  const origin = req.headers?.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  // Valider le token auth
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: 'Service indisponible' });
  }

  if (!serviceRoleKey) {
    console.error('[verify-payment] SUPABASE_SERVICE_ROLE_KEY manquante — opération admin refusée');
    return res.status(500).json({ error: 'Configuration serveur incorrecte' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  const userEmail = authData.user.email || '';
  const { itemId } = req.body || {};

  if (!itemId) {
    return res.status(400).json({ error: 'itemId requis' });
  }

  // Chercher le plan actif en base de données
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Chercher dans user_plans
    const { data: planData } = await supabaseAdmin
      .from('user_plans')
      .select('plan_id, activated_at, chariow_order_id')
      .eq('email', userEmail)
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    if (planData) {
      // Vérifier que le plan correspond à l'item demandé ou qu'il est supérieur
      const planHierarchy: Record<string, number> = {
        free: 1,
        starter: 1,
        prd_n6d89d8s: 1,
        creator: 2,
        prd_f639rpw2: 2,
        pro: 3,
        prd_pq817d6j: 3,
      };
      const requestedLevel = planHierarchy[itemId] || 0;
      const activatedLevel = planHierarchy[planData.plan_id] || 0;

      if (activatedLevel >= requestedLevel || itemId.includes('_booster')) {
        return res.status(200).json({
          verified: true,
          planId: planData.plan_id,
          activatedAt: planData.activated_at,
          orderId: planData.chariow_order_id,
        });
      }
    }

    // Si pas trouvé en base (webhook pas encore arrivé), retourner pending
    return res.status(200).json({
      verified: false,
      pending: true,
      message: 'Paiement en cours de validation. Veuillez patienter quelques secondes.',
    });

  } catch (err: any) {
    console.error('[verify-payment] Erreur:', err?.message);
    return res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
}
