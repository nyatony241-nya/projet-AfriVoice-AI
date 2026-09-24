import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════
// Webhook Chariow — Vercel Serverless Function
// Reçoit les notifications de paiement Chariow et active les plans
// ══════════════════════════════════════════════════════════════

const CHARIOW_PRODUCT_TO_PLAN: Record<string, string> = {
  'prd_n6d89d8s': 'starter', // STARTER 1 900 FCFA → 10 min
  'prd_f639rpw2': 'creator', // CREATOR 4 900 FCFA → 30 min
  'prd_pq817d6j': 'pro',     // PRO STUDIO HD 8 900 FCFA → 60 min
  // Boosters de recharge supplémentaires
  'prd_221tec74': 'starter_booster',
  'prd_9zvjwbz5': 'creator_booster',
  'prd_78vr0y1w': 'pro_booster',
};

// Crédits en secondes ajoutés au wallet pour chaque produit acheté
// MODÈLE CRÉDITS PERMANENTS — les achats s'accumulent, ne se remplacent pas
const PACK_CREDITS_SECONDS: Record<string, number> = {
  'starter':         600,   // Starter  — 10 min = 600s
  'free':            600,   // Starter fallback
  'creator':        1800,   // Creator  — 30 min = 1 800s
  'pro':            3600,   // Pro      — 60 min = 3 600s
  'starter_booster': 900,   // Booster +15 min
  'creator_booster':1800,   // Booster +30 min
  'pro_booster':    3600,   // Booster +60 min
};

function verifyChariowSignature(body: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: any): Promise<string> {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: any, res: any) {
  // ── CORS restrictif ──
  const ALLOWED_ORIGINS = [
    'https://afrivoice.site',
    'https://www.afrivoice.site',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const requestOrigin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chariow-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET : health check pour Chariow (vérifie que l'endpoint est actif)
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'afrivoice-webhook-chariow', timestamp: new Date().toISOString() });
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const webhookSecret = process.env.CHARIOW_WEBHOOK_SECRET || '';
  const signature = req.headers['x-chariow-signature'] as string | undefined;

  const rawBody = await getRawBody(req);
  console.log('[Webhook Debug] Signature:', signature);
  console.log('[Webhook Debug] Raw Body Length:', rawBody.length);
  console.log('[Webhook Debug] Raw Body:', rawBody.slice(0, 100)); // Log only first 100 chars to avoid huge logs

  if (!verifyChariowSignature(rawBody, signature, webhookSecret)) {
    console.warn('[Webhook Chariow] Signature invalide ou secrèt manquant');
    if (webhookSecret) {
      // 🔒 SÉCURITÉ RÉACTIVÉE : On bloque les requêtes non signées
      return res.status(401).json({ error: 'Signature invalide' });
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  const eventType = event?.type || event?.event;
  const orderData = event?.data?.order || event?.order || event?.data || event?.sale;

  if (!eventType || !orderData) {
    return res.status(200).json({ received: true, processed: false, reason: 'Event non traité' });
  }

  // Traiter uniquement les paiements réussis
  if (eventType !== 'order.paid' && eventType !== 'payment.success' && eventType !== 'order.completed' && eventType !== 'successful.sale') {
    return res.status(200).json({ received: true, processed: false, reason: `Event ${eventType} ignoré` });
  }

  // Recherche agressive du product_id
  const productId = orderData.product_id || orderData.item_id || orderData.product?.id || event?.product?.id || event?.data?.product?.id || '';
  
  // Recherche agressive de l'email
  const userEmail = orderData.customer_email || orderData.email || orderData.customer?.email || event?.customer?.email || event?.data?.customer?.email || '';
  
  const chariowOrderId = orderData.id || orderData.order_id || '';

  if (!userEmail) {
    console.error('[Webhook Chariow] Email client manquant. Payload complet:', JSON.stringify(event));
    return res.status(200).json({ received: true, processed: false, reason: 'Email manquant' });
  }

  const planId = CHARIOW_PRODUCT_TO_PLAN[productId];
  if (!planId) {
    console.warn(`[Webhook Chariow] Produit inconnu : ${productId}. Payload complet:`, JSON.stringify(event));
    return res.status(200).json({ received: true, processed: false, reason: `Produit ${productId} non mappé` });
  }

  // Connexion Supabase avec la service_role key pour bypass RLS
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Webhook Chariow] SUPABASE_SERVICE_ROLE_KEY manquante — opération admin refusée');
    return res.status(500).json({ error: 'Configuration serveur incorrecte' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const creditsToAdd = PACK_CREDITS_SECONDS[planId];
    if (!creditsToAdd) {
      console.warn(`[Webhook Chariow] Pas de crédits définis pour le plan : ${planId}`);
      return res.status(200).json({ received: true, processed: false, reason: `Pas de crédits pour ${planId}` });
    }

    // ───────────────────────────────────────────────────────────
    // 1. LIRE le quota existant (bonus_seconds = wallet de crédits)
    // ───────────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('user_quotas')
      .select('bonus_seconds, monthly_limit, seconds_used')
      .eq('email', userEmail)
      .maybeSingle();

    const currentBonus = (existing?.bonus_seconds as number) || 0;
    const currentLimit = (existing?.monthly_limit as number) || 0;
    const currentUsed  = (existing?.seconds_used  as number) || 0;

    // ───────────────────────────────────────────────────────────
    // 2. CUMULER les crédits (jamais de reset, jamais de remplacement)
    //    bonus_seconds sert de "wallet" global — s'accumule à l'infini
    // ───────────────────────────────────────────────────────────
    const newBonus = currentBonus + creditsToAdd;
    const activatedAt = new Date();

    const { error: quotaError } = await supabase
      .from('user_quotas')
      .upsert(
        {
          email: userEmail,
          bonus_seconds:  newBonus,       // Wallet cumulé
          monthly_limit:  currentLimit,   // Inchangé
          seconds_used:   currentUsed,    // Inchangé (pas de reset !)
          chariow_order_id: chariowOrderId,
          updated_at: activatedAt.toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: false }
      );

    if (quotaError) {
      console.error('[Webhook Chariow] Erreur upsert crédits wallet:', quotaError);
    }

    // ───────────────────────────────────────────────────────────
    // 3. ENREGISTRER le pack acheté dans user_plans (historique)
    //    Pas d'expiration — expires_at null
    // ───────────────────────────────────────────────────────────
    const basePlanId = planId.replace('_booster', '') || planId;
    const { error: planError } = await supabase
      .from('user_plans')
      .upsert(
        {
          email: userEmail,
          plan_id: basePlanId,            // Dernier pack acheté (sans _booster)
          chariow_order_id: chariowOrderId,
          activated_at: activatedAt.toISOString(),
          expires_at: null,               // ⚠️ Pas d'expiration — crédits permanents
          is_active: true,
          updated_at: activatedAt.toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: false }
      );

    if (planError) {
      console.error('[Webhook Chariow] Erreur upsert user_plans:', planError);
    }

    console.log(`✅ [Webhook Chariow] ${eventType} traité : ${userEmail} → ${planId} (commande ${chariowOrderId})`);
    return res.status(200).json({ received: true, processed: true, plan: planId, email: userEmail });

  } catch (err: any) {
    console.error('[Webhook Chariow] Erreur de traitement:', err?.message);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
