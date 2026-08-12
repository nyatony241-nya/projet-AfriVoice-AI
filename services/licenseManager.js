// ── License Manager (Server-side JS) ──────────────────────────
// Gestion des licences Chariow avec cache 24h

import * as chariowProvider from './providers/chariowProvider.js';

// Cache en mémoire — clé: licenseKey, valeur: { data, timestamp }
const licenseCache = new Map();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Valide une licence utilisateur via l'API Chariow.
 * Utilise un cache de 24h pour éviter les appels répétés.
 */
export const validateUserLicense = async (licenseKey) => {
  // Vérifier le cache
  const cached = licenseCache.get(licenseKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  // Appel API Chariow
  const license = await chariowProvider.validateLicense(licenseKey);
  
  // Mettre en cache
  licenseCache.set(licenseKey, {
    data: license,
    timestamp: Date.now()
  });

  return license;
};

/**
 * Retourne les limites de quota pour un plan donné.
 * Ces limites correspondent aux forfaits AfriVoice.
 */
export const getQuotaForPlan = (planId) => {
  const quotas = {
    starter: { maxSeconds: 600,  maxCharsPerScript: 500,  label: 'STARTER — 10 min/mois' },
    creator: { maxSeconds: 1800, maxCharsPerScript: 1500, label: 'CREATOR — 30 min/mois' },
    pro:     { maxSeconds: 3600, maxCharsPerScript: 3000, label: 'PRO STUDIO HD — 60 min/mois' },
    free:    { maxSeconds: 60,   maxCharsPerScript: 200,  label: 'GRATUIT — 1 min/mois' }
  };
  
  return quotas[planId] || quotas.free;
};

/**
 * Invalide le cache pour une licence spécifique.
 * Utile après un webhook de paiement/renouvellement.
 */
export const invalidateLicenseCache = (licenseKey) => {
  licenseCache.delete(licenseKey);
};
