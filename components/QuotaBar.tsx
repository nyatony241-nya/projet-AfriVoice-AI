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
  const isUnsubscribed = currentPlan.id === 'none' || quota.maxSeconds <= 0;

  const maxSeconds = Math.max(0, quota.maxSeconds);
  const remainingSeconds = isUnsubscribed ? 0 : Math.max(0, maxSeconds - quota.usedSeconds);

  // Percentage of remaining quota (starts at 100% and decreases to 0% as quota is consumed)
  const remainingPercentage = isUnsubscribed || maxSeconds <= 0
    ? 0
    : Math.max(0, Math.min(100, Math.round((remainingSeconds / maxSeconds) * 100)));

  const isLowQuota = !isUnsubscribed && remainingPercentage <= 20 && remainingPercentage > 0;
  const isExhausted = !isUnsubscribed && remainingSeconds <= 0;

  const remainingMinutes = (remainingSeconds / 60).toFixed(1);
  const maxMinutesFormatted = (maxSeconds / 60).toFixed(0);

  return (
    <div
      className={`py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border transition-all mb-3 sm:mb-4 relative overflow-hidden ${
        isUnsubscribed
          ? isDark
            ? 'bg-[#14151C] border-white/10 shadow-sm'
            : 'bg-white border-zinc-200 shadow-xs'
          : isExhausted
          ? isDark
            ? 'bg-red-500/10 border-red-500/30 shadow-xs'
            : 'bg-red-50 border-red-300 shadow-xs'
          : isLowQuota
          ? isDark
            ? 'bg-amber-500/10 border-amber-500/30'
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
              isUnsubscribed
                ? isDark
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-amber-100 text-amber-600'
                : isExhausted
                ? 'bg-red-500 text-white'
                : isLowQuota
                ? 'bg-amber-400 text-black'
                : 'bg-[#D4FF00]/15 text-[#D4FF00]'
            }`}
          >
            {isUnsubscribed ? (
              <span className="text-xs">🔒</span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider truncate">
                {isEn ? 'Quota:' : 'Quota :'} {isUnsubscribed ? (isEn ? 'No Active Plan' : 'Sans Abonnement') : currentPlan.name}
              </span>
              <span
                className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded-full shrink-0 ${
                  isUnsubscribed
                    ? 'bg-zinc-700 text-zinc-200'
                    : isExhausted
                    ? 'bg-red-500 text-white'
                    : isLowQuota
                    ? 'bg-amber-400 text-black'
                    : 'bg-[#16A34A] text-white'
                }`}
              >
                {isUnsubscribed
                  ? (isEn ? 'INACTIVE' : 'NON ABONNÉ')
                  : isExhausted
                  ? (isEn ? '0% • EXHAUSTED' : '0% • ÉPUISÉ')
                  : `${remainingPercentage}% ${isEn ? 'REMAINING' : 'DISPONIBLE'}`}
              </span>
            </div>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700 font-bold">•</span>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
              {isUnsubscribed
                ? isEn
                  ? '0 min available • Choose a plan to unlock voice generation'
                  : '0 min disponible • Choisissez un forfait pour débloquer les voix'
                : isEn
                ? `Remaining: ${remainingMinutes}m out of ${maxMinutesFormatted}m`
                : `Reste : ${remainingMinutes}m sur ${maxMinutesFormatted}m`}
            </p>
          </div>
        </div>

        {/* Action Button: Subscribe for non-subscribers, Top Up for subscribers */}
        <button
          onClick={onTopUp}
          className={`px-2.5 py-1 rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-wider hover:scale-105 transition-transform shadow-xs shrink-0 ${
            isUnsubscribed
              ? 'bg-[#D4FF00] text-black'
              : 'bg-gradient-to-r from-[#D4FF00] to-[#E2FF3B] text-black'
          }`}
        >
          {isUnsubscribed ? (isEn ? '⚡ Subscribe' : '⚡ S\'abonner') : (isEn ? '+ Top Up' : '+ Recharge')}
        </button>
      </div>

      {/* Progress bar — decreases from 100% down to 0% as quota is consumed */}
      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUnsubscribed
              ? 'bg-zinc-600 opacity-20'
              : isExhausted
              ? 'bg-red-500'
              : isLowQuota
              ? 'bg-amber-400'
              : 'bg-[#D4FF00]'
          }`}
          style={{ width: `${isUnsubscribed ? 0 : remainingPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default React.memo(QuotaBar);
