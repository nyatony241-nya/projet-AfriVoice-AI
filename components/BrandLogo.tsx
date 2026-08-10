import React from 'react';

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * LogoIcon represents only the lime green rounded square containing the black microphone icon.
 * Used for small representations like avatar placeholders, tab headers, and sidebars.
 */
export const LogoIcon: React.FC<LogoIconProps> = ({ size, className, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="40 40 170 170"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Bloc de l'icône (Fond vert citron) */}
      <rect x="40" y="40" width="170" height="170" rx="35" fill="#ccff00" />

      {/* Icône Microphone (Noir) */}
      <g fill="#111111">
        {/* Tête du micro */}
        <rect x="100" y="70" width="50" height="80" rx="25" />
        
        {/* Lignes découpées sur la tête du micro (simulées par des lignes de la couleur de fond) */}
        <rect x="95" y="85" width="60" height="5" fill="#ccff00" />
        <rect x="95" y="100" width="60" height="5" fill="#ccff00" />
        <rect x="95" y="115" width="60" height="5" fill="#ccff00" />
        <rect x="95" y="130" width="60" height="5" fill="#ccff00" />

        {/* Support en forme de U */}
        <path d="M 85 110 v 25 a 40 40 0 0 0 80 0 v -25 h -8 v 25 a 32 32 0 0 1 -64 0 v -25 z" />
        
        {/* Pied du support */}
        <rect x="121" y="175" width="8" height="20" />
        
        {/* Base du pied */}
        <rect x="100" y="190" width="50" height="8" rx="3" />
      </g>
    </svg>
  );
};

/**
 * LogoFull represents the entire corporate logo:
 * Lime green icon + Brand Text (AfriVoice AI) + Subtitle (STUDIO DE SYNTHÈSE VOCALE).
 * It adapts its text color dynamically based on the current theme (isDark).
 */
export const LogoFull: React.FC<LogoIconProps & { isDark?: boolean }> = ({ className, isDark = true, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 750 250"
      width="100%"
      height="100%"
      className={className}
      {...props}
    >
      <defs>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap');
          .brand-text-full { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-weight: 700; font-size: 100px; letter-spacing: 1px; }
          .sub-text-full { font-family: 'Arial', sans-serif; font-weight: 500; font-size: 21px; letter-spacing: 5.5px; }
        `}</style>
      </defs>

      {/* Bloc de l'icône (Fond vert citron) */}
      <rect x="40" y="40" width="170" height="170" rx="35" fill="#ccff00" />

      {/* Icône Microphone (Noir) */}
      <g fill="#111111">
        {/* Tête du micro */}
        <rect x="100" y="70" width="50" height="80" rx="25" />
        
        {/* Lignes découpées sur la tête du micro (simulées par des lignes de la couleur de fond) */}
        <rect x="95" y="85" width="60" height="5" fill="#ccff00" />
        <rect x="95" y="100" width="60" height="5" fill="#ccff00" />
        <rect x="95" y="115" width="60" height="5" fill="#ccff00" />
        <rect x="95" y="130" width="60" height="5" fill="#ccff00" />

        {/* Support en forme de U */}
        <path d="M 85 110 v 25 a 40 40 0 0 0 80 0 v -25 h -8 v 25 a 32 32 0 0 1 -64 0 v -25 z" />
        
        {/* Pied du support */}
        <rect x="121" y="175" width="8" height="20" />
        
        {/* Base du pied */}
        <rect x="100" y="190" width="50" height="8" rx="3" />
      </g>

      {/* Texte Principal : AfriVoice */}
      <text
        x="240"
        y="155"
        className="brand-text-full"
        fill={isDark ? '#FFFFFF' : '#111111'}
        style={{ transition: 'fill 0.3s ease' }}
      >
        AfriVoice
      </text>

      {/* Texte Principal : AI */}
      <text
        x="610"
        y="155"
        className="brand-text-full"
        fill="#ccff00"
      >
        AI
      </text>

      {/* Sous-titre */}
      <text
        x="243"
        y="205"
        className="sub-text-full"
        fill={isDark ? '#A1A1AA' : '#555555'}
        style={{ transition: 'fill 0.3s ease' }}
      >
        STUDIO DE SYNTHÈSE VOCALE
      </text>
    </svg>
  );
};
