import React, { useRef, useState } from 'react';
import type { VoiceIdentity, VoiceTier } from '../types';

interface VoiceCardProps {
  voice: VoiceIdentity;
  isSelected: boolean;
  isLocked: boolean;
  isDark: boolean;
  isEn: boolean;
  onSelect: (voice: VoiceIdentity) => void;
  onLockedClick?: () => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  isLocked,
  isDark,
  isEn,
  onSelect,
  onLockedClick,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    const audio = new Audio(`/voice-samples/${voice.voiceId}.mp3`);
    audioRef.current = audio;
    setIsPlaying(true);
    setPreviewError(false);
    
    audio.play().catch(() => {
      setIsPlaying(false);
      setPreviewError(true);
      setTimeout(() => setPreviewError(false), 2000);
    });
    
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      setPreviewError(true);
      setTimeout(() => setPreviewError(false), 2000);
    };
  };

  const handleClick = () => {
    if (isLocked) {
      onLockedClick?.();
    } else {
      onSelect(voice);
    }
  };

  const getTierBadgeStyles = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'natural':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'dynamic':
        return 'bg-amber-500/15 text-amber-400';
      case 'premium':
        return 'bg-purple-500/15 text-purple-400';
      default:
        return 'bg-zinc-500/15 text-zinc-400';
    }
  };

  const getTierBadgeText = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'natural':
        return isEn ? 'Natural' : 'Naturelle';
      case 'dynamic':
        return isEn ? 'Dynamic' : 'Dynamique';
      case 'premium':
        return 'Premium';
      default:
        return tier;
    }
  };

  // Styles
  const baseCardStyles = 'relative w-full flex flex-col p-4 rounded-2xl border text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF00] focus-visible:ring-offset-2';
  
  const selectedDark = 'border-[#D4FF00] bg-gradient-to-b from-[#D4FF00]/10 to-transparent shadow-md shadow-[#D4FF00]/15 -translate-y-0.5';
  const selectedLight = 'border-[#D4FF00] bg-gradient-to-b from-[#D4FF00]/10 to-white shadow-md shadow-[#D4FF00]/15 -translate-y-0.5';
  
  const defaultDark = 'bg-[#14151C] border-white/10 hover:border-white/20 hover:-translate-y-0.5';
  const defaultLight = 'bg-white border-zinc-200 hover:border-zinc-300 hover:-translate-y-0.5';
  
  const lockedStyles = 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:border-white/10';

  let cardClass = baseCardStyles;
  
  if (isLocked) {
    cardClass += ` ${isDark ? 'bg-[#14151C] border-white/10' : 'bg-white border-zinc-200'} ${lockedStyles}`;
  } else if (isSelected) {
    cardClass += ` ${isDark ? selectedDark : selectedLight}`;
  } else {
    cardClass += ` ${isDark ? defaultDark : defaultLight}`;
  }
  
  if (isDark) {
    cardClass += ' focus-visible:ring-offset-[#09090B]';
  }

  const textColor = isDark ? 'text-white' : 'text-zinc-900';
  const descColor = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const previewBg = isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-zinc-100 hover:bg-zinc-200';
  const previewText = isDark ? 'text-zinc-300' : 'text-zinc-700';
  
  // Use voice.gender if available, fallback to trying to parse from persona if needed. Assuming gender exists based on instructions.
  const genderEmoji = voice.gender === 'male' ? '👨' : (voice.gender === 'female' ? '👩' : '👩');

  return (
    <button 
      onClick={handleClick}
      className={cardClass}
      aria-label={`${voice.persona} from ${voice.countryName}`}
    >
      {/* Top Row */}
      <div className="flex flex-row justify-between items-center w-full mb-2">
        <div className={`font-bold text-base flex items-center gap-2 ${textColor}`}>
          <span>{genderEmoji}</span>
          <span>{voice.persona}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLocked && <span className="text-sm" aria-hidden="true">🔒</span>}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${getTierBadgeStyles(voice.tier)}`}>
            {getTierBadgeText(voice.tier)}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className={`text-xs ${descColor} line-clamp-2 mb-4 flex-grow`}>
        {isEn ? voice.description_en : voice.description_fr}
      </p>

      {/* Preview Button */}
      <div className="mt-auto w-full pt-2">
        <button
          onClick={handlePreview}
          disabled={isLocked}
          className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${previewBg} ${previewText}`}
          aria-label={isEn ? `Listen to ${voice.persona}` : `Écouter ${voice.persona}`}
        >
          {isPlaying ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4FF00]"></span>
              </span>
              <span>{isEn ? 'Playing...' : 'En cours...'}</span>
            </>
          ) : previewError ? (
             <span>{isEn ? 'Soon' : 'Bientôt'}</span>
          ) : (
            <>
              <span>🔊</span>
              <span>{isEn ? 'Listen' : 'Écouter'}</span>
            </>
          )}
        </button>
      </div>
    </button>
  );
};

export default VoiceCard;
