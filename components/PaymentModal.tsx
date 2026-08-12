import React, { useState, useEffect } from 'react';
import { PricingPlan, Language } from '../types';
import { getAvailablePaymentMethods, getMobileMoneyOperators } from '../services/paymentConfig';
import MobileMoneySelector from './MobileMoneySelector';

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [availableOperators, setAvailableOperators] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPaymentMethod(null);
      setError(null);
      fetchPaymentMethods();
    }
  }, [isOpen, userCountryId]);

  const fetchPaymentMethods = async () => {
    setLoadingMethods(true);
    try {
      const response = await fetch(`/api/payment/methods/${userCountryId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableOperators(data.operators || []);
      } else {
        // Fallback côté client si l'API est inaccessible
        const operators = getMobileMoneyOperators(userCountryId);
        setAvailableOperators(operators);
      }
    } catch (err) {
      // Fallback local
      const operators = getMobileMoneyOperators(userCountryId);
      setAvailableOperators(operators);
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleProcessCardPayment = async () => {
    await processPayment('card');
  };

  const handleProcessMoMoPayment = async (phoneNumber: string, operator: string) => {
    await processPayment('momo', { phoneNumber, operator });
  };

  const processPayment = async (method: 'card' | 'momo', additionalData?: any) => {
    setIsProcessing(true);
    setError(null);
    setStep(2);

    try {
      const payload = {
        planId: plan.id,
        countryId: userCountryId,
        paymentMethod: method === 'momo' ? 'mobile_money' : 'card',
        successUrl: window.location.origin + '?payment=success',
        cancelUrl: window.location.origin + '?payment=cancel',
        ...additionalData
      };
      
      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      if (data.checkoutUrl) {
        // Redirect vers la page de paiement hébergée (Chariow, Paystack, etc.)
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(isEn ? 'No checkout URL received' : 'Aucune URL de paiement reçue');
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'Payment processing failed. Please try again.' : 'Le traitement du paiement a échoué. Veuillez réessayer.'));
      setIsProcessing(false);
      setStep(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={!isProcessing ? onClose : undefined}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden ${
          isDark 
            ? 'bg-[#14151C] border border-white/10 text-white' 
            : 'bg-white border border-zinc-200 text-black'
        }`}
      >
        {!isProcessing && (
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
            <div className="mb-6">
              <h2 className="text-2xl font-black mb-1">
                {isEn ? 'Complete Payment' : 'Finaliser le Paiement'}
              </h2>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {isEn ? 'Select your preferred payment method' : 'Sélectionnez votre mode de paiement'}
              </p>
            </div>

            {/* Plan Summary */}
            <div className={`p-4 rounded-[24px] mb-6 flex justify-between items-center border ${
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

            {error && (
              <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}

            {!paymentMethod ? (
              <div className="space-y-4">
                {/* Payment Methods */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all duration-300 hover:scale-[1.02] hover:border-[#D4FF00] ${
                    isDark ? 'bg-[#1E1F2A] border-white/10' : 'bg-white border-zinc-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">💳</div>
                    <div className="text-left">
                      <div className="font-black text-lg">
                        {isEn ? 'Bank Card' : 'Carte Bancaire'}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Visa, Mastercard
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setPaymentMethod('momo')}
                  disabled={loadingMethods || availableOperators.length === 0}
                  className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all duration-300 ${
                    loadingMethods || availableOperators.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-[1.02] hover:border-[#D4FF00]'
                  } ${
                    isDark ? 'bg-[#1E1F2A] border-white/10' : 'bg-white border-zinc-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">📱</div>
                    <div className="text-left">
                      <div className="font-black text-lg">Mobile Money</div>
                      <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {loadingMethods 
                          ? (isEn ? 'Loading...' : 'Chargement...') 
                          : availableOperators.length > 0 
                            ? availableOperators.join(', ')
                            : (isEn ? 'Not available' : 'Non disponible')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {/* Flag logic can go here based on countryId */}
                    </span>
                    <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            ) : paymentMethod === 'momo' ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button 
                  onClick={() => setPaymentMethod(null)}
                  className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-4 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEn ? 'Back' : 'Retour'}
                </button>
                <MobileMoneySelector
                  isDark={isDark}
                  language={language}
                  countryId={userCountryId}
                  operators={availableOperators}
                  onSubmit={handleProcessMoMoPayment}
                />
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button 
                  onClick={() => setPaymentMethod(null)}
                  className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-4 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEn ? 'Back' : 'Retour'}
                </button>
                <div className="text-center py-6">
                  <p className="font-bold mb-6">
                    {isEn ? 'You will be redirected to our secure payment gateway.' : 'Vous allez être redirigé vers notre plateforme de paiement sécurisée.'}
                  </p>
                  <button
                    onClick={handleProcessCardPayment}
                    className={`w-full py-4 rounded-[24px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-[#D4FF00] text-black hover:bg-[#E2FF3B]`}
                  >
                    {isEn ? 'Proceed to Payment' : 'Procéder au Paiement'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            {/* Skeleton Loading Animation */}
            <div className="w-20 h-20 mb-8 relative">
              <div className={`absolute inset-0 rounded-full border-4 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#D4FF00] border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-2xl font-black mb-2">
              {isEn ? 'Processing Payment...' : 'Traitement du Paiement...'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isEn ? 'Please wait while we secure your transaction.' : 'Veuillez patienter pendant que nous sécurisons votre transaction.'}
            </p>
            
            <div className="w-full max-w-xs mt-8 space-y-3">
              <div className={`h-4 rounded-full w-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`}></div>
              <div className={`h-4 rounded-full w-4/5 mx-auto animate-pulse ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
