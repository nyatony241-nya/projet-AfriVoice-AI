import React from 'react';
import { Country } from '../types';

interface CountryCardProps {
  country: Country;
  isSelected: boolean;
  onSelect: (country: Country) => void;
  isLocked?: boolean;
  onLockedClick?: () => void;
  language?: 'en' | 'fr';
}

const CountryCard: React.FC<CountryCardProps> = ({ country, isSelected, onSelect, isLocked, onLockedClick, language = 'fr' }) => {
  return (
    <button
      onClick={() => {
        if (isLocked && onLockedClick) {
          onLockedClick();
        } else if (!isLocked) {
          onSelect(country);
        }
      }}
      className={`relative p-1.5 sm:p-2.5 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 group outline-none select-none text-center min-w-0 overflow-hidden ${
        isLocked
          ? 'border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16171E] hover:-translate-y-1 hover:shadow-lg transition-all duration-300'
          : isSelected
          ? 'border-[#D4FF00] shadow-md shadow-[#D4FF00]/15 -translate-y-0.5 z-10 bg-gradient-to-b from-[#D4FF00]/10 to-transparent dark:from-[#D4FF00]/10 ring-1.5 ring-[#D4FF00]/30 scale-[1.02]'
          : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16171E] hover:border-[#D4FF00]/60 dark:hover:border-[#D4FF00]/60 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[#D4FF00]/10 hover:bg-[#FAFAFA] dark:hover:bg-[#1E202B]'
      }`}
    >
      {/* Glow effect on hover/select */}
      <div
        className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ${
          isSelected ? 'opacity-100' : 'group-hover:opacity-40'
        } bg-gradient-to-tr from-[#D4FF00]/5 dark:from-[#D4FF00]/5 to-transparent pointer-events-none`}
      />

      <div
        className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-2xl transition-all duration-500 shadow-xs ${
          isLocked
            ? 'bg-zinc-100 dark:bg-[#202330] group-hover:rotate-3 group-hover:scale-105'
            : isSelected
            ? 'bg-gradient-to-tr from-[#D4FF00] to-[#E2FF3B] text-black shadow-[#D4FF00]/30 rotate-3 scale-105'
            : 'bg-zinc-100 dark:bg-[#202330] group-hover:rotate-3 group-hover:scale-105'
        }`}
      >
        {country.flag}
      </div>

      <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
        <span
          className={`text-[9px] sm:text-[11px] font-black tracking-tight transition-colors duration-300 truncate w-full ${
            isLocked
              ? 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white'
              : isSelected ? 'text-zinc-900 dark:text-[#D4FF00]'
              : 'text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white'
          }`}
        >
          {country.name}
        </span>
        <div
          className={`flex items-center justify-center gap-1 transition-all duration-300 ${
            isSelected || isLocked ? 'translate-y-0 opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          <span
            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors shrink-0 ${
              isLocked ? 'bg-zinc-400 group-hover:bg-[#D4FF00]' : isSelected ? 'bg-[#D4FF00]' : 'bg-zinc-400 group-hover:bg-[#D4FF00] dark:group-hover:bg-[#D4FF00]'
            }`}
          />
          <span className="text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate max-w-[65px]">
            {isLocked ? '🔒 PRO' : (
              country.primaryLanguage === 'French' ? (language === 'en' ? 'French' : 'Français') :
              country.primaryLanguage === 'English' ? (language === 'en' ? 'English' : 'Anglais') :
              country.primaryLanguage === 'Arabic' ? (language === 'en' ? 'Arabic' : 'Arabe') :
              country.primaryLanguage
            )}
          </span>
        </div>
      </div>

      {/* Padlock indicator when locked */}
      {isLocked && (
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-black/80 dark:bg-white/90 text-white dark:text-black p-0.5 sm:p-1 rounded-md shadow-md z-20 flex items-center justify-center">
          <span className="text-[9px] sm:text-[10px] leading-none">🔒</span>
        </div>
      )}

      {!isLocked && isSelected && (
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-[#D4FF00] text-black p-0.5 rounded-md shadow-md animate-in zoom-in duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 sm:h-3 sm:w-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
};

export default CountryCard;
