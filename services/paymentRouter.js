// ── Payment Router (Server-side JS) ───────────────────────────
// Cerveau du système — route chaque paiement vers le bon provider

import { getPaymentConfigForCountry, CHARIOW_PRODUCTS } from './paymentConfig.js';
import * as chariowProvider from './providers/chariowProvider.js';
import * as paystackProvider from './providers/paystackProvider.js';
import * as pawapayProvider from './providers/pawapayProvider.js';
import * as flutterwaveProvider from './providers/flutterwaveProvider.js';
import * as paytechProvider from './providers/paytechProvider.js';

/**
 * Route un paiement vers le provider approprié selon le pays.
 * Stratégie : Chariow d'abord, puis fallback si échec.
 */
export const routePayment = async (countryId, planId, customerEmail, paymentMethod, successUrl, cancelUrl) => {
  const config = getPaymentConfigForCountry(countryId);
  
  if (!config) {
    throw new Error(`Configuration de paiement introuvable pour le pays: ${countryId}`);
  }

  const product = CHARIOW_PRODUCTS[planId];
  if (!product) {
    throw new Error(`Plan invalide: ${planId}`);
  }
  
  const amount = product.priceXOF;
  const currency = config.currency;
  const metadata = { countryId, planId, customerEmail };

  try {
    // ── Tentative Provider Principal (Chariow) ──
    if (config.primaryProvider === 'chariow') {
      const response = await chariowProvider.initiateCheckout(
        product.id,
        customerEmail,
        successUrl,
        cancelUrl,
        metadata
      );
      return {
        checkoutUrl: response.checkoutUrl,
        provider: 'chariow',
        transactionRef: response.transactionRef
      };
    }
    throw new Error(`Provider principal non supporté: ${config.primaryProvider}`);
  } catch (error) {
    console.error(`❌ Provider principal (${config.primaryProvider}) échoué:`, error.message);
    
    // ── Fallback ──
    if (config.fallbackProvider) {
      console.log(`🔄 Tentative fallback: ${config.fallbackProvider}`);
      
      switch (config.fallbackProvider) {
        case 'paystack': {
          const res = await paystackProvider.initializePayment(amount, currency, customerEmail, successUrl, metadata);
          return { checkoutUrl: res.authorizationUrl, provider: 'paystack', transactionRef: res.reference };
        }
        case 'pawapay': {
          // PawaPay nécessite un numéro de téléphone — pas applicable pour le checkout initial
          // On redirige vers un formulaire de saisie de numéro côté frontend
          throw new Error('PawaPay nécessite un numéro de téléphone. Utilisez le flux Mobile Money côté frontend.');
        }
        case 'flutterwave': {
          const res = await flutterwaveProvider.initializePayment(amount, currency, customerEmail, successUrl, paymentMethod, metadata);
          return { checkoutUrl: res.paymentLink, provider: 'flutterwave', transactionRef: res.reference };
        }
        case 'paytech': {
          const res = await paytechProvider.createPayment(amount, currency, `AfriVoice ${planId}`, successUrl, cancelUrl, metadata);
          return { checkoutUrl: res.paymentUrl, provider: 'paytech', transactionRef: res.reference };
        }
        default:
          throw new Error(`Fallback non supporté: ${config.fallbackProvider}`);
      }
    }
    
    throw new Error('Le routage du paiement a échoué et aucun fallback n\'est disponible.');
  }
};
