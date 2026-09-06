import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════
// Webhook Chariow — Vercel Serverless Function
// Reçoit les notifications de paiement Chariow et active les plans
// ══════════════════════════════════════════════════════════════

const CHARIOW_PRODUCT_TO_PLAN: Record<string, string> = {
  'prd_n6d89d8s': 'free',    // STARTER 1 900 FCFA
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

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.mychariow.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const webhookSecret = process.env.CHARIOW_WEBHOOK_SECRET || '';
  const signature = req.headers['x-chariow-signature'] as string | undefined;

  // Obtenir le body brut pour la vérification de signature
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (!verifyChariowSignature(rawBody, signature, webhookSecret)) {
    console.warn('[Webhook Chariow] Signature invalide ou secrèt manquant');
    // En développement (secret vide), on accepte quand même pour faciliter les tests
    if (webhookSecret) {
      return res.status(401).json({ error: 'Signature invalide' });
    }
  }

  let event: any;
  try {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  const eventType = event?.type || event?.event;
  const orderData = event?.data?.order || event?.order || event?.data;

  if (!eventType || !orderData) {
    return res.status(200).json({ received: true, processed: false, reason: 'Event non traité' });
  }

  // Traiter uniquement les paiements réussis
  if (eventType !== 'order.paid' && eventType !== 'payment.success' && eventType !== 'order.completed') {
    return res.status(200).json({ received: true, processed: false, reason: `Event ${eventType} ignoré` });
  }

  const productId = orderData.product_id || orderData.item_id || '';
  const userEmail = orderData.customer_email || orderData.email || '';
  const chariowOrderId = orderData.id || orderData.order_id || '';

  if (!userEmail) {
    console.error('[Webhook Chariow] Email client manquant dans le payload');
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
      // Ajouter des secondes bonus à l'utilisateur
      const { error } = await supabase
        .from('user_quotas')
        .upsert(
          { email: userEmail, bonus_seconds: bonusSeconds, chariow_order_id: chariowOrderId, updated_at: new Date().toISOString() },
          { onConflict: 'email', ignoreDuplicates: false }
        );
      if (error) {
        console.error('[Webhook Chariow] Erreur upsert bonus:', error);
      }
    } else {
      // Activer / upgrader le plan
      const { error } = await supabase
        .from('user_plans')
        .upsert(
          {
            email: userEmail,
            plan_id: planId,
            chariow_order_id: chariowOrderId,
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email', ignoreDuplicates: false }
        );
      if (error) {
        console.error('[Webhook Chariow] Erreur upsert plan:', error);
      }
    }

    console.log(`✅ [Webhook Chariow] ${eventType} traité : ${userEmail} → ${planId} (commande ${chariowOrderId})`);
    return res.status(200).json({ received: true, processed: true, plan: planId, email: userEmail });

  } catch (err: any) {
    console.error('[Webhook Chariow] Erreur de traitement:', err?.message);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
