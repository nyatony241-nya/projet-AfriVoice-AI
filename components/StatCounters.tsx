import React, { useEffect, useState } from 'react';
import { PricingPlan, Language } from '../types';

interface StatCountersProps {
  availableCountriesCount: number;
  totalCountriesCount: number;
  currentPlan: PricingPlan;
  isDark: boolean;
  language?: Language;
}

const StatCounters: React.FC<StatCountersProps> = ({
  availableCountriesCount,
  totalCountriesCount,
  currentPlan,
  isDark,
  language = 'fr',
}) => {
  const isEn = language === 'en';
  // Animated counters
  const [countriesCount, setCountriesCount] = useState(0);
  const [voicesCount, setVoicesCount] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);

  useEffect(() => {
    // Animate from 0 to target over 1.2 seconds
    const duration = 1200;
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setCountriesCount(Math.round(availableCountriesCount * eased));
      setVoicesCount(Math.round(5 * eased));
      setSampleRate(Math.round(24 * eased));

      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [availableCountriesCount]);

  const stats = [
    {
      id: 'countries',
      label: isEn ? 'Available Accents & Countries' : 'Accents & Pays Disponibles',
      value: `${countriesCount} / ${totalCountriesCount}`,
      sub: currentPlan.id === 'free' ? (isEn ? '5 countries (Free Plan)' : '5 pays (Plan Free)') : (isEn ? 'Access to entire continent' : 'Accès au continent entier'),
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA580C] dark:text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
        </svg>
      ),
      trend: isEn ? '+15 PRO' : '+15 PRO',
      trendPositive: currentPlan.id !== 'free',
    },
    {
      id: 'voices',
      label: isEn ? 'AI 2.5 Voice Models' : 'Modèles Vocaux IA 2.5',
      value: `${voicesCount} ${isEn ? 'HD Voices' : 'Voix HD'}`,
      sub: 'Kore, Zephyr, Puck, Charon...',
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA580C] dark:text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      trend: isEn ? 'Natural HD' : 'Naturel HD',
      trendPositive: true,
    },
    {
      id: 'quality',
      label: isEn ? 'Quality & Sampling Rate' : 'Qualité & Échantillonnage',
      value: `${sampleRate} kHz PCM`,
      sub: isEn ? 'Integrated HD Mastering Studio' : 'Mastering Studio HD intégré',
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA580C] dark:text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      trend: 'WAV + MP3',
      trendPositive: true,
    },
    {
      id: 'quota',
      label: isEn ? 'Current Plan Status' : 'Statut Forfait Actuel',
      value: currentPlan.id.toUpperCase(),
      sub: `${currentPlan.name.split(' – ')[0]} • ${currentPlan.price}`,
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA580C] dark:text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      trend: currentPlan.id === 'pro' ? (isEn ? 'Unlimited' : 'Illimité') : (isEn ? 'Standard' : 'Standard'),
      trendPositive: currentPlan.id === 'pro',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 mb-3 sm:mb-4 min-w-0">
      {stats.map((stat, i) => (
        <div
          key={stat.id}
          className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 group relative overflow-hidden flex flex-col justify-between min-w-0 ${
            isDark
              ? 'bg-[#18181B] border-white/5 hover:border-white/15 shadow-xs'
              : 'bg-white border-[#FDE8CD] hover:border-[#EA580C]/40 shadow-xs'
          }`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Subtle gradient glow inside */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 rounded-full bg-gradient-to-br from-[#EA580C]/10 dark:from-[#D4FF00]/10 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

          <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-[#09090B]' : 'bg-[#FFFBF5]'}`}>
                {stat.icon}
              </div>
              <p className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-wider truncate flex-1">{stat.label}</p>
            </div>
            <span
              className={`text-[6px] sm:text-[7px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full shrink-0 ${
                stat.trendPositive
                  ? isDark
                    ? 'bg-[#16A34A]/20 text-[#4ADE80]'
                    : 'bg-[#16A34A]/10 text-[#16A34A]'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {stat.trend}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-1 min-w-0 mt-0.5">
            <div className="text-xs sm:text-sm lg:text-base font-black font-mono tracking-tight text-zinc-900 dark:text-white truncate">
              {stat.value}
            </div>
            <p className="text-[7px] sm:text-[8px] text-zinc-400 dark:text-zinc-500 font-medium truncate hidden sm:block max-w-[45%]">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCounters;
