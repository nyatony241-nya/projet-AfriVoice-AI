import React from 'react';
import { PricingPlan, Language } from '../types';

interface SidebarProps {
  activeTab: 'studio' | 'mastering' | 'history' | 'pricing';
  onTabChange: (tab: 'studio' | 'mastering' | 'history' | 'pricing') => void;
  currentPlan: PricingPlan;
  isDark: boolean;
  historyCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  language?: Language;
  onOpenAuditModal?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentPlan,
  isDark,
  historyCount,
  isOpenMobile,
  onCloseMobile,
  language = 'fr',
  onOpenAuditModal,
}) => {
  const navItemsFr = [
    {
      id: 'studio' as const,
      label: 'Studio Voix-Off',
      badge: 'IA 2.5',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      id: 'mastering' as const,
      label: 'Console Mastering',
      badge: currentPlan.id === 'pro' ? 'HD' : 'PRO',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'history' as const,
      label: 'Bibliothèque & Audio',
      badge: historyCount > 0 ? `${historyCount}` : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'pricing' as const,
      label: 'Forfaits & Tarifs',
      badge: currentPlan.id.toUpperCase(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const navItemsEn = [
    {
      id: 'studio' as const,
      label: 'Voice-Over Studio',
      badge: 'AI 2.5',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      id: 'mastering' as const,
      label: 'Mastering Console',
      badge: currentPlan.id === 'pro' ? 'HD' : 'PRO',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'history' as const,
      label: 'Audio Library & History',
      badge: historyCount > 0 ? `${historyCount}` : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'pricing' as const,
      label: 'Plans & Pricing',
      badge: currentPlan.id.toUpperCase(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const navItems = language === 'en' ? navItemsEn : navItemsFr;

  const content = (
    <div className={`flex flex-col h-full justify-between p-6 ${isDark ? 'bg-[#0E0F15] text-zinc-300' : 'bg-[#FAFAFA] text-zinc-800'}`}>
      {/* Top Section: Logo & Nav */}
      <div>
          {/* Unified Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 mb-8 pl-1 group cursor-pointer" onClick={() => onTabChange('studio')}>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0 border relative overflow-hidden group ${
              isDark
                ? 'bg-gradient-to-br from-[#D4FF00] to-[#84CC16] text-black shadow-[#D4FF00]/20 border-[#D4FF00]/50'
                : 'bg-gradient-to-br from-[#D4FF00] to-[#A3E635] text-black shadow-[#D4FF00]/30 border-[#D4FF00]/60'
            }`}>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 font-black drop-shadow-sm group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" strokeWidth={2.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M22 9v4" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 9v4" />
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className={`text-base sm:text-lg font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  AfriVoice<span className={'text-[#D4FF00]'}>AI</span>
                </span>
                <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow-xs ${
                  'bg-[#D4FF00] text-black'
                }`}>
                  {currentPlan.id.toUpperCase()}
                </span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-[0.16em] leading-tight block mt-0.5">
                {language === 'en' ? 'Synthesis Studio' : 'Studio de Synthèse'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 px-3 mb-3">
            {language === 'en' ? 'Studio Navigation' : 'Navigation Studio'}
          </p>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-extrabold transition-all duration-300 group relative ${
                  isActive
                    ? isDark ? isDark ? 'bg-[#D4FF00]/10 text-[#D4FF00] shadow-sm' : 'bg-[#D4FF00] text-black shadow-md' : 'bg-[#D4FF00] text-black shadow-md'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className={`absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full transition-all ${'bg-[#D4FF00]'}`} />
                )}

                <div className="flex items-center gap-3">
                  <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isActive
                        ? isDark
                          ? 'bg-[#D4FF00] text-black'
                          : 'bg-[#D4FF00] text-black'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      {/* Bottom Section: User & Status */}
      <div className="pt-6 border-t border-zinc-200 dark:border-white/10">
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-[#181D29] border-white/5' : 'bg-white border-[#E4E4E7] shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-md ${
              'bg-[#D4FF00] text-black'
            }`}>
              AV
            </div>
            <div>
              <p className="text-xs font-extrabold truncate">Studio Creator</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{currentPlan.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block w-[270px] shrink-0 h-screen sticky top-0 border-r z-30 ${isDark ? 'border-white/10' : 'border-[#E4E4E7]'}`}>
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={onCloseMobile}
              className="absolute top-5 right-4 z-20 p-2 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
