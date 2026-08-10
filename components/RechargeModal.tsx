import React from 'react';

export interface QuotaPack {
  id: string;
  name: string;
  nameEn: string;
  minutes: number;
  seconds: number;
  price: string;
  priceEn: string;
  popular?: boolean;
  description: string;
  descriptionEn: string;
  badge?: string;
  badgeEn?: string;
}

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  language?: 'fr' | 'en';
  onSelectPack: (pack: QuotaPack) => void;
}

export const QUOTA_PACKS: QuotaPack[] = [
  {
    id: 'starter_booster',
    name: 'Pack Découverte',
    nameEn: 'Starter Booster',
    minutes: 15,
    seconds: 900,
    price: '990 FCFA',
    priceEn: '990 FCFA ($1.50)',
    description: 'Idéal pour compléter un projet court ou une capsule urgente.',
    descriptionEn: 'Ideal for short videos or quick audio completions.',
    badge: 'ACCESSIBLE',
    badgeEn: 'STARTER',
  },
  {
    id: 'creator_booster',
    name: 'Pack Créateur',
    nameEn: 'Creator Booster',
    minutes: 30,
    seconds: 1800,
    price: '1 990 FCFA',
    priceEn: '1,990 FCFA ($3.00)',
    popular: true,
    description: 'Le choix parfait pour les vidéos TikTok, Reels et podcasts.',
    descriptionEn: 'The sweet spot for social media creators & podcasts.',
    badge: 'POPULAIRE',
    badgeEn: 'POPULAR',
  },
  {
    id: 'pro_booster',
    name: 'Pack Pro Studio',
    nameEn: 'Pro Studio Booster',
    minutes: 60,
    seconds: 3600,
    price: '3 490 FCFA',
    priceEn: '3,490 FCFA ($5.50)',
    description: 'Conçu pour les agences, publicités radio/TV et gros volumes.',
    descriptionEn: 'Designed for agencies, TV/Radio ads & heavy volumes.',
    badge: 'MEILLEURE VALEUR',
    badgeEn: 'BEST VALUE',
  },
];

const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  isDark,
  language = 'fr',
  onSelectPack,
}) => {
  if (!isOpen) return null;
  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop with Blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-3xl rounded-[32px] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto ${
          isDark
            ? 'bg-[#14151C] border border-white/10 text-zinc-100'
            : 'bg-white border border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Section */}
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#ccff00]/15 text-black dark:text-[#ccff00] mb-3">
            {isEn ? '⚡ Voice Quota Recharge' : '⚡ Recharge de Quota Vocale'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            {isEn ? 'Choose Your Quota Category' : 'Choisissez Votre Catégorie de Quota'}
          </h2>
          <p className={`text-xs sm:text-sm max-w-lg mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEn
              ? 'Select the exact amount of additional voice synthesis minutes you need to continue your creations.'
              : 'Sélectionnez le volume exact de minutes de synthèse vocale supplémentaire dont vous avez besoin.'}
          </p>
        </div>

        {/* 3 Quota Categories Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {QUOTA_PACKS.map((pack) => {
            const isPopular = pack.popular;
            return (
              <div
                key={pack.id}
                onClick={() => onSelectPack(pack)}
                className={`relative rounded-2xl p-5 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:scale-[1.03] active:scale-[0.98] ${
                  isPopular
                    ? isDark
                      ? 'bg-[#1E2230] border-[#ccff00] shadow-lg shadow-[#ccff00]/10'
                      : 'bg-white border-[#ccff00] shadow-xl shadow-[#ccff00]/15'
                    : isDark
                    ? 'bg-[#09090B] border-white/10 hover:border-white/20'
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#ccff00] text-black text-[9px] font-black uppercase tracking-wider shadow-md">
                    {isEn ? pack.badgeEn : pack.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                      {isEn ? pack.nameEn : pack.name}
                    </span>
                    {!isPopular && (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {isEn ? pack.badgeEn : pack.badge}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tight text-[#ccff00]">
                        +{pack.minutes}
                      </span>
                      <span className="text-sm font-extrabold text-zinc-400">Min</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 block mt-0.5">
                      (+{(pack.seconds).toLocaleString()} {isEn ? 'sec' : 'sec'})
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {isEn ? pack.descriptionEn : pack.description}
                  </p>
                </div>

                <div>
                  <div className="pt-3 border-t border-zinc-200 dark:border-white/10 mb-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400">{isEn ? 'Tariff:' : 'Tarif :'}</span>
                    <span className="text-base font-black tracking-tight">
                      {isEn ? pack.priceEn : pack.price}
                    </span>
                  </div>

                  <button
                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-[#ccff00] text-black hover:bg-[#E2FF3B] shadow-[#ccff00]/20'
                        : isDark
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span>{isEn ? 'Select Pack' : 'Choisir ce Pack'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <p className="text-[11px] font-bold text-center text-zinc-500">
          {isEn
            ? '🔒 Safe payment via Mobile Money & Cards. Minutes are added immediately to your balance.'
            : '🔒 Paiement sécurisé par Mobile Money & Cartes. Les minutes s’ajoutent immédiatement à votre solde.'}
        </p>
      </div>
    </div>
  );
};

export default RechargeModal;
