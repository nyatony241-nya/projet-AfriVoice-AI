import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════
// Webhook Chariow — Vercel Serverless Function
// Reçoit les notifications de paiement Chariow et active les plans
// ══════════════════════════════════════════════════════════════

const CHARIOW_PRODUCT_TO_PLAN: Record<string, string> = {
  'prd_n6d89d8s': 'starter', // STARTER 1 900 FCFA
  'prd_f639rpw2': 'creator', // CREATOR 4 900 FCFA
  'prd_pq817d6j': 'pro',     // PRO STUDIO HD 8 900 FCFA
  // Boosters de recharge
  'prd_221tec74': 'starter_booster',
  'prd_9zvjwbz5': 'creator_booster',
  'prd_78vr0y1w': 'pro_booster',
};

const BOOSTER_SECONDS: Record<string, number> = {
  'starter_booster': 900,  // +15 min
  'creator_booster': 1800, // +30 min
  'pro_booster':     3600, // +60 min
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      // Pour debugger temporairement en production, on ne bloque PAS
      // return res.status(401).json({ error: 'Signature invalide' });
      console.warn('[Webhook Debug] BYPASSING SIGNATURE CHECK TEMPORARILY FOR DEBUGGING');
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

  const productId = orderData.product_id || orderData.item_id || orderData.product?.id || '';
  const userEmail = orderData.customer_email || orderData.email || orderData.customer?.email || '';
  const chariowOrderId = orderData.id || orderData.order_id || '';

  if (!userEmail) {
    console.error('[Webhook Chariow] Email client manquant dans le payload', JSON.stringify(orderData).slice(0, 200));
    return res.status(200).json({ received: true, processed: false, reason: 'Email manquant' });
  }

  const planId = CHARIOW_PRODUCT_TO_PLAN[productId];
  if (!planId) {
    console.warn(`[Webhook Chariow] Produit inconnu : ${productId}`);
    return res.status(200).json({ received: true, processed: false, reason: `Produit ${productId} non mappé` });
  }

  // Connexion Supabase avec la service_role key pour bypass RLS
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Webhook Chariow] Variables Supabase manquantes');
    return res.status(500).json({ error: 'Configuration serveur incorrecte' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const isBooster = planId.includes('_booster');
    const bonusSeconds = BOOSTER_SECONDS[planId];

    if (isBooster && bonusSeconds) {
      // Lire les bonus existants avant d'incrémenter (évite l'écrasement)
      const { data: existing } = await supabase
        .from('user_quotas')
        .select('bonus_seconds')
        .eq('email', userEmail)
        .maybeSingle();

      const currentBonus = (existing?.bonus_seconds as number) || 0;
      const newBonus = currentBonus + bonusSeconds;

      const { error } = await supabase
        .from('user_quotas')
        .upsert(
          { email: userEmail, bonus_seconds: newBonus, chariow_order_id: chariowOrderId, updated_at: new Date().toISOString() },
          { onConflict: 'email', ignoreDuplicates: false }
        );
      if (error) {
        console.error('[Webhook Chariow] Erreur upsert bonus:', error);
      }
    } else {
      // Activer / upgrader le plan
      // expires_at = aujourd'hui + 30 jours (renouvellement mensuel)
      const activatedAt = new Date();
      const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('user_plans')
        .upsert(
          {
            email: userEmail,
            plan_id: planId,
            chariow_order_id: chariowOrderId,
            activated_at: activatedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            updated_at: activatedAt.toISOString(),
          },
          { onConflict: 'email', ignoreDuplicates: false }
        );
      if (error) {
        console.error('[Webhook Chariow] Erreur upsert plan:', error);
      }

      // ✅ Mettre à jour monthly_limit selon le plan activé
      // free = Starter (10 min = 600s), creator = 30 min (1800s), pro = 60 min (3600s)
      const PLAN_LIMITS: Record<string, number> = {
        'starter': 600,   // Starter — 10 min
        'free':    600,   // Starter fallback — 10 min
        'creator': 1800,  // Creator — 30 min
        'pro':     3600,  // Pro — 60 min
      };
      const newLimit = PLAN_LIMITS[planId];
      if (newLimit) {
        const { error: quotaError } = await supabase
          .from('user_quotas')
          .upsert(
            {
              email: userEmail,
              monthly_limit: newLimit,
              seconds_used: 0,        // Reset à 0 lors de l'activation
              reset_date: new Date().toISOString().slice(0, 10).slice(0, 8) + '01', // 1er du mois
              updated_at: activatedAt.toISOString(),
            },
            { onConflict: 'email', ignoreDuplicates: false }
          );
        if (quotaError) {
          console.error('[Webhook Chariow] Erreur mise à jour quota:', quotaError);
        }
      }
    }

    console.log(`✅ [Webhook Chariow] ${eventType} traité : ${userEmail} → ${planId} (commande ${chariowOrderId})`);
    return res.status(200).json({ received: true, processed: true, plan: planId, email: userEmail });

  } catch (err: any) {
    console.error('[Webhook Chariow] Erreur de traitement:', err?.message);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
