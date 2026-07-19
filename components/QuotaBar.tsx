import React from 'react';
import { PricingPlan, QuotaUsage, Language } from '../types';

interface QuotaBarProps {
  currentPlan: PricingPlan;
  quota: QuotaUsage;
  isDark: boolean;
  onOpenKeyPicker: () => void;
  onTopUp: () => void;
  language?: Language;
}

const QuotaBar: React.FC<QuotaBarProps> = ({
  currentPlan,
  quota,
  isDark,
  onOpenKeyPicker,
  onTopUp,
  language = 'fr',
}) => {
  const isEn = language === 'en';
  const percentage = Math.min(100, Math.round((quota.usedSeconds / quota.maxSeconds) * 100));
  const isHighUsage = percentage >= 80;
  const isExhausted = percentage >= 100;

  const usedMinutes = (quota.usedSeconds / 60).toFixed(1);
  const maxMinutes = (quota.maxSeconds / 60).toFixed(0);

  return (
    <div
      className={`py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border transition-all mb-3 sm:mb-4 relative overflow-hidden ${
        isExhausted
          ? isDark
            ? 'bg-red-500/10 border-red-500/30 shadow-xs'
            : 'bg-red-50 border-red-300 shadow-xs'
          : isHighUsage
          ? isDark
            ? 'bg-[#E2FF3B]/10 border-[#E2FF3B]/30'
            : 'bg-amber-50 border-amber-300'
          : isDark
          ? 'bg-[#14151C] border-white/10 shadow-sm'
          : 'bg-white border-[#E4E4E7] shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              isExhausted
                ? 'bg-red-500 text-white'
                : isHighUsage
                ? 'bg-[#E2FF3B] text-black'
                : 'bg-[#D4FF00]/15 text-[#D4FF00]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider truncate">
                {isEn ? 'Quota:' : 'Quota :'} {currentPlan.name}
              </span>
              <span
                className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded-full shrink-0 ${
                  isExhausted
                    ? 'bg-red-500 text-white'
                    : isHighUsage
                    ? 'bg-[#E2FF3B] text-black'
                    : 'bg-[#16A34A] text-white'
                }`}
              >
                {isExhausted ? (isEn ? '100% FULL' : '100% ATTEINT') : `${percentage}% ${isEn ? 'USED' : 'UTILISÉ'}`}
              </span>
            </div>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700 font-bold">•</span>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
              {currentPlan.id === 'free'
                ? isEn ? `Daily: ${usedMinutes}m / ${maxMinutes}m` : `Journalier : ${usedMinutes}m / ${maxMinutes}m`
                : isEn ? `Included: ${usedMinutes}m used / ${maxMinutes}m` : `Inclus : ${usedMinutes}m sur ${maxMinutes}m`}
            </p>
          </div>
        </div>

        {/* Top-up recharge button */}
        {(isHighUsage || isExhausted || currentPlan.id !== 'free') && (
          <button
            onClick={onTopUp}
            className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#D4FF00] to-[#E2FF3B] text-black font-black text-[9px] sm:text-[10px] uppercase tracking-wider hover:scale-105 transition-transform shadow-xs shrink-0"
          >
            {isEn ? '+ Top Up' : '+ Recharge'}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isExhausted
              ? 'bg-red-500'
              : isHighUsage
              ? 'bg-[#E2FF3B]'
              : 'bg-[#D4FF00]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default QuotaBar;
