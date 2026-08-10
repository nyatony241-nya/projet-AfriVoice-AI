import React from 'react';
import { PricingPlan, Language } from '../types';
import { supabase } from '../services/supabaseClient';
import { LogoIcon } from './BrandLogo';

interface SidebarProps {
  activeTab: 'studio' | 'history' | 'pricing';
  onTabChange: (tab: 'studio' | 'history' | 'pricing') => void;
  currentPlan: PricingPlan;
  isDark: boolean;
  historyCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  language?: Language;
  onOpenAuditModal?: () => void;
  onOpenInstallModal?: () => void;
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
  onOpenInstallModal,
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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-[#ccff00]/15 shrink-0 relative overflow-hidden group">
              <LogoIcon className="w-full h-full group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className={`text-base sm:text-lg font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  AfriVoice<span className={'text-[#ccff00]'}>AI</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow-xs bg-[#ccff00] text-black">
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
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 px-3 mb-3">
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
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-extrabold transition-all duration-300 group relative ${
                  isActive
                    ? isDark ? 'bg-[#D4FF00]/10 text-[#D4FF00] shadow-sm' : 'bg-[#D4FF00] text-black shadow-md'
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
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
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

        {/* Install App Button */}
        <div className="px-4 mt-6">
          <button
            onClick={onOpenInstallModal}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
              isDark
                ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10'
                : 'bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {language === 'en' ? 'Install App' : 'Installer l\'App'}
          </button>
        </div>

      {/* Bottom Section: User & Status */}
      <div className="pt-6 border-t border-zinc-200 dark:border-white/10 space-y-3">
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-[#181D29] border-white/5' : 'bg-white border-[#E4E4E7] shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shadow-md">
              <LogoIcon className="w-full h-full" />
            </div>
            <div>
              <p className="text-sm font-extrabold truncate">Studio Creator</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{currentPlan.name}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            isDark
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-red-600 hover:bg-red-50'
          }`}
        >
          {language === 'en' ? 'Sign Out' : 'Se déconnecter'}
        </button>
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

export default React.memo(Sidebar);
