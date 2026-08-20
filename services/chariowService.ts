// ══════════════════════════════════════════════════════════════
// Service de redirection Chariow — Checkout 1-Click
// Chariow gère automatiquement :
// - Détection du pays et de la devise
// - Mobile Money (Orange Money, Wave, MTN MoMo, Moov, Airtel, etc.)
// - Cartes bancaires (Visa, Mastercard)
// ══════════════════════════════════════════════════════════════

export const CHARIOW_CHECKOUT_URLS: Record<string, string> = {
  // Forfaits mensuels
  free:            'https://kboghdly.mychariow.shop/prd_n6d89d8s',  // STARTER
  starter:         'https://kboghdly.mychariow.shop/prd_n6d89d8s',  // STARTER
  creator:         'https://kboghdly.mychariow.shop/prd_f639rpw2',  // CREATOR
  pro:             'https://kboghdly.mychariow.shop/prd_pq817d6j',  // PRO – STUDIO HD

  // Packs de recharges vocales
  starter_booster: 'https://kboghdly.mychariow.shop/prd_221tec74',  // Pack Découverte (+15 min)
  creator_booster: 'https://kboghdly.mychariow.shop/prd_9zvjwbz5',  // Pack Créateur (+30 min)
  pro_booster:     'https://kboghdly.mychariow.shop/prd_78vr0y1w',  // Pack Pro Studio (+60 min)
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
