// ══════════════════════════════════════════════════════════════
// Service de redirection Chariow — Checkout 1-Click
// Chariow gère automatiquement :
// - Détection du pays et de la devise
// - Mobile Money (Orange Money, Wave, MTN MoMo, Moov, Airtel, etc.)
// - Cartes bancaires (Visa, Mastercard)
// ══════════════════════════════════════════════════════════════

export const CHARIOW_CHECKOUT_URLS: Record<string, string> = {
  // Forfaits mensuels
  free:            'https://afrivoice.site/prd_n6d89d8s',  // STARTER (1 900 FCFA)
  starter:         'https://afrivoice.site/prd_n6d89d8s',  // STARTER (1 900 FCFA)
  creator:         'https://afrivoice.site/prd_f639rpw2',  // CREATOR (4 900 FCFA)
  pro:             'https://afrivoice.site/prd_pq817d6j',  // PRO – STUDIO HD (8 900 FCFA)

  // Packs de recharges vocales
  starter_booster: 'https://afrivoice.site/prd_221tec74',  // Pack Découverte (+15 min) (990 FCFA)
  creator_booster: 'https://afrivoice.site/prd_9zvjwbz5',  // Pack Créateur (+30 min) (1 990 FCFA)
  pro_booster:     'https://afrivoice.site/prd_78vr0y1w',  // Pack Pro Studio (+60 min) (3 490 FCFA)
};

/**
 * Construit l'URL de checkout Chariow pré-remplie et redirige l'utilisateur.
 * 
 * @param itemId ID du forfait ou du pack de recharge
 * @param userEmail Email de l'utilisateur pour pré-remplir le formulaire Chariow
 * @returns boolean Indique si la redirection a été initiée avec succès
 */
export const redirectToChariowCheckout = (itemId: string, userEmail?: string): boolean => {
  const baseUrl = CHARIOW_CHECKOUT_URLS[itemId];
  if (!baseUrl) {
    console.error(`[Chariow] URL de checkout introuvable pour l'élément: ${itemId}`);
    return false;
  }

  const origin = window.location.origin;
  const successUrl = encodeURIComponent(`${origin}?payment=success&item=${itemId}`);
  const cancelUrl = encodeURIComponent(`${origin}?payment=cancel`);

  const separator = baseUrl.includes('?') ? '&' : '?';
  let checkoutUrl = `${baseUrl}${separator}success_url=${successUrl}&cancel_url=${cancelUrl}`;

  if (userEmail && userEmail.trim() !== '') {
    checkoutUrl += `&email=${encodeURIComponent(userEmail.trim())}`;
  }

  // Redirection directe
  window.location.href = checkoutUrl;
  return true;
};
