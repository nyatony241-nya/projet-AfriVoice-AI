import React, { useState, useEffect } from 'react';
import { PricingPlan, Language } from '../types';
import { COUNTRIES } from '../constants';
import { getMobileMoneyOperators } from '../services/paymentConfig';

// ══════════════════════════════════════════════════════════════
// URLs de checkout Chariow — Redirection directe vers la page
// de paiement hébergée. Chariow gère carte + mobile money + 
// tous les pays automatiquement. Aucun backend requis.
// ══════════════════════════════════════════════════════════════
const CHARIOW_CHECKOUT_URLS: Record<string, string> = {
  free:    'https://kboghdly.mychariow.shop/prd_n6d89d8s',  // STARTER
  starter: 'https://kboghdly.mychariow.shop/prd_n6d89d8s',  // STARTER (alias)
  creator: 'https://kboghdly.mychariow.shop/prd_f639rpw2',  // CREATOR
  pro:     'https://kboghdly.mychariow.shop/prd_pq817d6j',  // PRO – STUDIO HD
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  language: Language;
  plan: PricingPlan;
  userEmail: string;
  userCountryId: string;
  onPaymentSuccess: (planId: string, licenseKey?: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  isDark,
  language,
  plan,
  userEmail,
  userCountryId,
  onPaymentSuccess,
}) => {
  const isEn = language === 'en';
  const [step, setStep] = useState<1 | 2>(1);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [availableOperators, setAvailableOperators] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Pays actif sélectionné dans le modal (par défaut celui du studio)
  const [selectedCountryId, setSelectedCountryId] = useState<string>(userCountryId || 'CI');

  useEffect(() => {
    if (userCountryId) {
      setSelectedCountryId(userCountryId);
    }
  }, [userCountryId]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      loadOperators(selectedCountryId);
    }
  }, [isOpen, selectedCountryId]);

  const loadOperators = (countryId: string) => {
    setLoadingMethods(true);
    const operators = getMobileMoneyOperators(countryId);
    setAvailableOperators(operators);
    setLoadingMethods(false);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCountryId(e.target.value);
  };

  /**
   * Redirige vers la page de checkout Chariow.
   * Chariow gère automatiquement :
   * - Carte bancaire (Visa, Mastercard)
   * - Mobile Money (tous opérateurs selon le pays)
   * - Crypto, Wave, etc.
   * 
   * L'utilisateur choisit son moyen de paiement sur la page Chariow.
   */
  const handleProceedToCheckout = () => {
    setStep(2);
    setError(null);

    const checkoutBaseUrl = CHARIOW_CHECKOUT_URLS[plan.id];

    if (!checkoutBaseUrl) {
      setError(isEn ? 'Invalid plan selected.' : 'Forfait invalide sélectionné.');
      setStep(1);
      return;
    }

    // Construire l'URL avec les paramètres de retour
    const successUrl = encodeURIComponent(window.location.origin + '?payment=success&plan=' + plan.id);
    const cancelUrl = encodeURIComponent(window.location.origin + '?payment=cancel');
    
    // Chariow supporte les query params pour pré-remplir le checkout
    const separator = checkoutBaseUrl.includes('?') ? '&' : '?';
    const checkoutUrl = `${checkoutBaseUrl}${separator}success_url=${successUrl}&cancel_url=${cancelUrl}${userEmail ? '&email=' + encodeURIComponent(userEmail) : ''}`;
    
    // Redirection vers Chariow — l'utilisateur choisira carte ou mobile money là-bas
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 800); // Petit délai pour montrer l'animation de chargement
  };

  if (!isOpen) return null;

  const currentCountryObj = COUNTRIES.find(c => c.id === selectedCountryId) || COUNTRIES[0];
  const hasMobileMoney = availableOperators.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={step === 1 ? onClose : undefined}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg rounded-[32px] p-8 shadow-2xl overflow-hidden ${
          isDark 
            ? 'bg-[#14151C] border border-white/10 text-white' 
            : 'bg-white border border-zinc-200 text-black'
        }`}
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {step === 1 && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {step === 1 && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black mb-1">
                {isEn ? 'Complete Payment' : 'Finaliser le Paiement'}
              </h2>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {isEn ? 'Review your plan and proceed to secure checkout' : 'Vérifiez votre forfait et procédez au paiement sécurisé'}
              </p>
            </div>

            {/* Selector de pays */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                🌍 {isEn ? 'Your Country' : 'Votre Pays'}
              </label>
              <div className="relative">
                <select
                  value={selectedCountryId}
                  onChange={handleCountryChange}
                  className={`w-full appearance-none p-3.5 pl-4 pr-10 rounded-[18px] font-bold text-sm border outline-none transition-all cursor-pointer ${
                    isDark
                      ? 'bg-[#1E1F2A] border-white/10 text-white focus:border-[#D4FF00]'
                      : 'bg-zinc-100 border-zinc-200 text-black focus:border-[#D4FF00]'
                  }`}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id} className={isDark ? 'bg-[#14151C] text-white' : 'bg-white text-black'}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Plan Summary */}
            <div className={`p-4 rounded-[24px] mb-4 flex justify-between items-center border ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div>
                <div className="text-xs font-bold uppercase text-zinc-500 mb-1">
                  {isEn ? 'Selected Plan' : 'Forfait Choisi'}
                </div>
                <div className="font-black text-lg">{plan.name}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-xl text-[#D4FF00]">{plan.price}</div>
              </div>
            </div>

            {/* Moyens de paiement disponibles */}
            <div className={`p-4 rounded-[20px] mb-6 border ${
              isDark ? 'bg-white/3 border-white/5' : 'bg-zinc-50/50 border-zinc-100'
            }`}>
              <div className="text-xs font-bold uppercase text-zinc-400 mb-3">
                {isEn ? 'Available payment methods' : 'Moyens de paiement disponibles'}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  isDark ? 'bg-white/10 text-white' : 'bg-white text-zinc-800 shadow-sm'
                }`}>
                  💳 Visa / Mastercard
                </span>
                {hasMobileMoney && availableOperators.map((op) => (
                  <span key={op} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    📱 {op}
                  </span>
                ))}
                {!hasMobileMoney && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    isDark ? 'bg-zinc-500/10 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    📱 {isEn ? 'Card payment only' : 'Paiement carte uniquement'}
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}

            {/* Bouton principal — redirige vers Chariow */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-4 rounded-[24px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-[#D4FF00] text-black hover:bg-[#E2FF3B]"
            >
              {isEn ? '🔒 Proceed to Secure Checkout' : '🔒 Procéder au Paiement Sécurisé'}
            </button>

            <p className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {isEn 
                ? 'You will be redirected to Chariow\'s secure payment page' 
                : 'Vous serez redirigé vers la page de paiement sécurisée Chariow'}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            {/* Loading Spinner */}
            <div className="w-20 h-20 mb-8 relative">
              <div className={`absolute inset-0 rounded-full border-4 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#D4FF00] border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-2xl font-black mb-2">
              {isEn ? 'Redirecting to Chariow...' : 'Redirection vers Chariow...'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isEn 
                ? 'You will choose your payment method (card or mobile money) on the next page.' 
                : 'Vous choisirez votre moyen de paiement (carte ou mobile money) sur la page suivante.'}
            </p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PaymentModal;
