import React, { useState } from 'react';
import { PricingPlan, Language } from '../types';
import { redirectToChariowCheckout } from '../services/chariowService';

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
}) => {
  const isEn = language === 'en';
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      redirectToChariowCheckout(plan.id, userEmail);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        onClick={!isRedirecting ? onClose : undefined}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          isDark 
            ? 'bg-[#14151C] border border-white/10 text-white' 
            : 'bg-white border border-zinc-200 text-black'
        }`}
      >
        {!isRedirecting && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {!isRedirecting ? (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#D4FF00]/15 text-black dark:text-[#D4FF00] mb-2">
                🔒 {isEn ? 'Chariow Secure Checkout' : 'Paiement Sécurisé Chariow'}
              </span>
              <h2 className="text-2xl font-black tracking-tight mb-1">
                {isEn ? 'Confirm Plan' : 'Confirmer le Forfait'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {isEn 
                  ? 'Pay securely via Mobile Money or Bank Card on Chariow' 
                  : 'Payez en toute sécurité par Mobile Money ou Carte bancaire sur Chariow'}
              </p>
            </div>

            {/* Plan Card */}
            <div className={`p-5 rounded-[24px] mb-6 border flex justify-between items-center ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div>
                <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">
                  {isEn ? 'Selected Subscription' : 'Abonnement Sélectionné'}
                </div>
                <div className="font-black text-xl">{plan.name}</div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {plan.description}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-2xl text-[#D4FF00]">{plan.price}</div>
              </div>
            </div>

            {/* Payment Methods Badges */}
            <div className={`p-4 rounded-[20px] mb-6 border text-center ${
              isDark ? 'bg-white/3 border-white/5' : 'bg-zinc-50/50 border-zinc-100'
            }`}>
              <div className="text-[11px] font-bold text-zinc-400 mb-2">
                {isEn ? 'Supported Payment Methods:' : 'Moyens de paiement acceptés :'}
              </div>
              <div className="flex items-center justify-center flex-wrap gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                  📱 Mobile Money (Orange, MTN, Wave, Moov)
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400">
                  💳 Visa / Mastercard
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleCheckout}
              className="w-full py-4 rounded-[22px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-lg shadow-[#D4FF00]/20 flex items-center justify-center gap-2"
            >
              <span>{isEn ? 'Payer avec Chariow' : 'Payer avec Chariow'}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            {/* Loading Spinner */}
            <div className="w-16 h-16 mb-6 relative">
              <div className={`absolute inset-0 rounded-full border-4 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#D4FF00] border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-black mb-2">
              {isEn ? 'Opening Chariow Checkout...' : 'Ouverture de Chariow...'}
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isEn 
                ? 'You are being redirected to Chariow\'s secure payment page.' 
                : 'Vous êtes redirigé vers la page de paiement sécurisée Chariow.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
