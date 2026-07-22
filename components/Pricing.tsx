import React, { useState } from 'react';
import { PRICING_PLANS } from '../constants';
import { PricingPlan } from '../types';

interface PricingProps {
  currentPlanId: string;
  isDark: boolean;
  onSubscribe: (planId: string) => void;
  language: 'fr' | 'en';
}

const Pricing: React.FC<PricingProps> = ({ currentPlanId, isDark, onSubscribe, language }) => {
  const isEn = language === 'en';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.id === 'free' || plan.id === currentPlanId) return;
    setLoadingPlan(plan.id);
    await onSubscribe(plan.id);
    setLoadingPlan(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h2 className={`text-4xl md:text-5xl font-black mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {isEn ? 'Simple & Transparent Pricing' : 'Des tarifs simples et transparents'}
        </h2>
        <p className="text-lg text-zinc-500">
          {isEn ? 'Choose the plan that fits your needs. Cancel anytime.' : 'Choisissez le forfait adapté à vos besoins. Annulable à tout moment.'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {PRICING_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          
          return (
            <div 
              key={plan.id}
              className={`relative p-8 rounded-3xl border flex flex-col ${
                plan.isPopular 
                  ? isDark 
                    ? 'bg-zinc-800/50 border-[#D4FF00] shadow-lg shadow-[#D4FF00]/10' 
                    : 'bg-white border-[#D4FF00] shadow-xl'
                  : isDark
                    ? 'bg-[#1A1D27] border-[#2E3341]'
                    : 'bg-white border-[#E4E4E7]'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4FF00] text-black text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                  {isEn ? 'Most Popular' : 'Le plus populaire'}
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{plan.name}</h3>
                <div className={`text-3xl font-black mb-2 ${isDark ? 'text-[#D4FF00]' : 'text-zinc-900'}`}>{plan.price}</div>
                <p className="text-sm text-zinc-500">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrent || loadingPlan !== null}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                  isCurrent
                    ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500'
                    : plan.isPopular
                      ? 'bg-[#D4FF00] text-black hover:bg-[#bce600] shadow-lg hover:-translate-y-0.5'
                      : isDark
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                        : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                {loadingPlan === plan.id ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isCurrent ? (
                  isEn ? 'Current Plan' : 'Forfait Actuel'
                ) : (
                  isEn ? 'Subscribe' : 'S\'abonner'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Pricing;
