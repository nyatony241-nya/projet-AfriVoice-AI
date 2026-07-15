import React from 'react';
import { PricingPlan, Language } from '../types';

interface HeaderProps {
  currentPlan: PricingPlan;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenKeyPicker: () => void;
  activeTab: 'studio' | 'mastering' | 'history' | 'pricing';
  onTabChange: (tab: 'studio' | 'mastering' | 'history' | 'pricing') => void;
  language?: Language;
  onToggleLanguage?: () => void;
  onOpenAuditModal?: () => void;
  onOpenMobileSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentPlan,
  theme,
  onToggleTheme,
  onOpenKeyPicker,
  activeTab,
  onTabChange,
  language = 'fr',
  onToggleLanguage,
  onOpenAuditModal,
  onOpenMobileSidebar,
}) => {
  const isDark = theme === 'dark';

  const tabNamesFr: Record<string, string> = {
    studio: 'Studio de Synthèse',
    mastering: 'Console de Mastering HD',
    history: 'Bibliothèque & Historique',
    pricing: 'Forfaits & Abonnement',
  };

  const tabNamesEn: Record<string, string> = {
    studio: 'AI Synthesis Studio',
    mastering: 'HD Mastering Console',
    history: 'Audio Library & History',
    pricing: 'Plans & Subscription',
  };

  const currentTabName = language === 'en' ? tabNamesEn[activeTab] : tabNamesFr[activeTab];

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300 ${
        isDark
          ? 'bg-[#09090B]/85 border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
          : 'bg-[#FFFBF5]/90 border-[#FDE8CD] shadow-[0_4px_25px_rgba(234,88,12,0.04)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Unified Logo & Title (Responsive across Web & Mobile) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer" onClick={() => onTabChange('studio')}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center shadow-md shrink-0 border ${
              isDark
                ? 'bg-gradient-to-tr from-[#D4FF00] via-[#84CC16] to-[#10B981] text-black shadow-[#D4FF00]/20 border-[#D4FF00]/40'
                : 'bg-gradient-to-tr from-[#EA580C] via-[#F59E0B] to-[#DC2626] text-white shadow-[#EA580C]/25 border-[#EA580C]/30'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 font-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 10v2a7 7 0 01-14 0v-2m14 0h-2m-10 0H3m9 11v3m-3 0h6" />
              </svg>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className={`text-sm sm:text-lg font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  AfriVoice<span className={isDark ? 'text-[#D4FF00]' : 'text-[#EA580C]'}>AI</span>
                </span>
                <span className={`text-[7px] sm:text-[9px] font-black uppercase px-1 py-0.5 sm:px-1.5 rounded tracking-wider shadow-xs ${
                  isDark ? 'bg-[#D4FF00] text-black' : 'bg-[#EA580C] text-white'
                }`}>
                  {currentPlan.id.toUpperCase()}
                </span>
              </div>
              <span className="text-[7px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-[0.14em] sm:tracking-[0.16em] leading-tight block mt-0.5 truncate max-w-[125px] sm:max-w-none">
                {currentTabName || 'Studio de Synthèse'}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-zinc-200 dark:border-white/10">
            <span
              onClick={() => onTabChange('pricing')}
              className={`cursor-pointer px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                currentPlan.id === 'pro'
                  ? 'bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#D4FF00] text-black shadow-md font-black'
                  : currentPlan.id === 'creator'
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 font-black'
                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 border border-zinc-200 dark:border-white/10 font-bold'
              }`}
            >
              Forfait : {currentPlan.name}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* API Key Picker Button */}
          <button
            onClick={onOpenKeyPicker}
            className={`px-2 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-1 shrink-0 ${
              isDark
                ? 'bg-[#18181B] border-white/10 text-[#D4FF00] hover:bg-[#27272A] hover:border-[#D4FF00]/40'
                : 'bg-white border-[#FDE8CD] text-[#EA580C] hover:bg-[#FFF7ED] hover:border-[#EA580C]/40 shadow-xs'
            }`}
            title={language === 'en' ? 'Connect / Configure Gemini API Key' : 'Connecter / Configurer la clé API Gemini'}
          >
            <span className="text-xs sm:text-sm">🔑</span>
            <span className="hidden sm:inline">{language === 'en' ? 'API Key' : 'Clé API'}</span>
          </button>

          {/* Language Switcher Button (FR | EN) */}
          {onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className={`px-2 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-0.5 sm:gap-1 shrink-0 ${
                isDark
                  ? 'bg-[#18181B] border-white/10 text-white hover:bg-[#27272A] hover:border-white/20'
                  : 'bg-white border-[#FDE8CD] text-zinc-800 hover:bg-[#FFF7ED] shadow-xs'
              }`}
              title="Changer de langue / Switch language"
            >
              <span className={language === 'fr' ? 'text-[#EA580C] dark:text-[#D4FF00]' : 'opacity-40'}>FR</span>
              <span className="opacity-30">|</span>
              <span className={language === 'en' ? 'text-[#EA580C] dark:text-[#D4FF00]' : 'opacity-40'}>EN</span>
            </button>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 border flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#18181B] border-white/10 text-[#D4FF00] hover:bg-[#27272A] hover:border-white/20'
                : 'bg-white border-[#FDE8CD] text-[#EA580C] hover:bg-[#FFF7ED] shadow-xs'
            }`}
            title={isDark ? 'Passer en Mode Afrique Premium (Clair)' : 'Passer en Mode Nuit Professionnelle (Sombre)'}
          >
            {isDark ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Top Navigation Tabs Bar (Visible only on mobile below lg - always directly accessible at top) */}
      <div className={`lg:hidden border-t px-2 py-1.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shadow-sm ${
        isDark ? 'border-white/10 bg-[#09090B]/95' : 'border-[#FDE8CD] bg-[#FFFBF5]/95'
      }`}>
        {[
          {
            id: 'studio' as const,
            label: language === 'en' ? 'Studio' : 'Studio',
            badge: 'IA 2.5',
            icon: (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ),
          },
          {
            id: 'mastering' as const,
            label: language === 'en' ? 'Mastering' : 'Mastering',
            badge: currentPlan.id === 'pro' ? 'HD' : 'PRO',
            icon: (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            ),
          },
          {
            id: 'history' as const,
            label: language === 'en' ? 'Audio' : 'Audio',
            icon: (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            ),
          },
          {
            id: 'pricing' as const,
            label: language === 'en' ? 'Forfaits' : 'Forfaits',
            badge: currentPlan.id.toUpperCase(),
            icon: (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-black tracking-tight transition-all shrink-0 ${
                isActive
                  ? isDark
                    ? 'bg-[#D4FF00] text-black shadow-md shadow-[#D4FF00]/20 scale-[1.02]'
                    : 'bg-[#EA580C] text-white shadow-md shadow-[#EA580C]/25 scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded-full hidden xs:inline-block ${
                  isActive
                    ? isDark ? 'bg-black/20 text-black' : 'bg-white/20 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};

export default Header;
